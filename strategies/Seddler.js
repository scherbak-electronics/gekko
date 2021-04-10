/* 
 * SEKO
 * Scherbak Electronics
 * 
 * Seddler strategy for Gekko.
 * For more information on everything please refer
 * to this document:
 *
 * https://gekko.wizb.it/docs/strategies/creating_a_strategy.html
 */

var log = require('../core/log');
var config = require('../core/util.js').getConfig();

// Let's create our own strat
var strat = {};

// Prepare everything our method needs
strat.init = function() {
  console.log('strategy init');
  // how much the price should change before we place an order
  this.priceChagePercentage = this.settings.price_chage_percentage;
  
  // number of buy orders we can place before stop buying 
  // and begin to wait while price will go up
  this.ordersGridDownLevels = this.settings.orders_grid_down_levels;
  
  // buy order initial amount 
  this.buyOrderAmount = this.settings.buy_order_amount;
  
  // how much the amount of the current order 
  // is greater than the amount of the previous one
  this.amountLevelFactor = this.settings.amount_level_factor;
  
  this.input = 'candle';
  this.priceDirection = '';
  this.prevPrice = 0;
  this.currentPrice = 0;
  this.initialBuy = false;

  this.buyOrdersGrid = [];
  this.currentBuyGridLevel = 0;
  this.amountToBuy = 0;
  this.amountToSell = 0;
}

// What happens on every new candle?
strat.update = function(candle) {
  //console.log('strategy update. price: ' + candle.vwp);
  this.toUpdate = false;
  if (this.prevPrice === 0) {
    this.currentPrice = candle.vwp;
    this.prevPrice = this.currentPrice;
    this.initialBuy = true;
    this.toUpdate = true;
    console.log('initial set prev price');
    console.log(candle);
  } else {
    /*
    If the price increased, use the formula [(New Price - Old Price)/Old Price] 
    and then multiply that number by 100. If the price decreased, 
    use the formula [(Old Price - New Price)/Old Price] and multiply that number by 100.
    */
    var priceChangePercent = 0;
    
    if (this.prevPrice < candle.vwp) {
      priceChangePercent = ((candle.vwp - this.prevPrice) / this.prevPrice) * 100;
      this.priceDirection = 'up';
    } else {
      priceChangePercent = ((this.prevPrice - candle.vwp) / this.prevPrice) * 100;
      this.priceDirection = 'down';
    }

    if (priceChangePercent >= this.priceChagePercentage) {
      this.currentPrice = candle.vwp;
      this.prevPrice = this.currentPrice;
      if (this.priceDirection == 'up') {
        console.log('\x1b[32m%s\x1b[0m', 'price change up ' + priceChangePercent);
        
      } else {
        console.log('\x1b[31m%s\x1b[0m', 'price change down ' + priceChangePercent);
        
      }
      this.toUpdate = true;
    }
  }
}

// For debugging purposes.
strat.log = function() {
  log.debug('debug log..');
}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function() {
  // Only continue if we have a new update.
  if(!this.toUpdate) {
    return;
  }
  if (this.initialBuy) {
    this.initialBuy = false;
    this.amountToBuy = this.buyOrderAmount;
    this.advice({
      direction: 'long',
      amount: this.amountToBuy
    });
    // this.advice('long');
    this.buyOrdersGrid.push({
      amount: this.amountToBuy,
      price: this.currentPrice
    });
    console.log('initial buy advice happened! ' + this.amountToBuy + ' price: ' + this.currentPrice);
  } else {
    if(this.priceDirection === 'up') {
      // we have to sell asset
      console.log('price up!');
      if (this.buyOrdersGrid.length > 0) {
        this.amountToSell = this.buyOrdersGrid[this.buyOrdersGrid.length - 1].amount;
        this.advice({
          direction: 'short',
          amount: this.amountToSell
        });
        // this.advice('short');
        this.buyOrdersGrid.splice(this.buyOrdersGrid.length - 1, 1);
      }
    } else {
      // we have to buy
      console.log('price down..');
      // If it was short, set it to long
      // this.currentTrend = 'long';
      if (this.buyOrdersGrid.length <= this.ordersGridDownLevels) {
        if (this.buyOrdersGrid.length > 0) {
          this.amountToBuy = this.buyOrdersGrid[this.buyOrdersGrid.length - 1].amount * this.amountLevelFactor;
        } else {
          this.amountToBuy = this.buyOrderAmount;
        }
        // this.advice('long');
        this.advice({
          direction: 'long',
          amount: this.amountToBuy
        });
        this.buyOrdersGrid.push({
          amount: this.amountToBuy,
          price: this.currentPrice
        });
      } 
    }
  }
  this.toUpdate = false;
}

module.exports = strat;
