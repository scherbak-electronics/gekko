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
const _ = require('lodash');
var log = require('../core/log');
var config = require('../core/util.js').getConfig();

// trading grid object
var grid = {};

grid.init = function(settings) {
  this.orders = [];
  this.orderIdCounter = 0;
  this.prevPrice = 0;
  this.currentPrice = 0;
  this.priceDirection = undefined;
  this.initialOrderPlaced = false;
  this.priceChangePercent = settings.price_chage_percent;
  this.minPercentOfProfit = settings.min_percent_of_profit;
  this.currencyTradingLimitPercent = settings.trading_currency_limit_percent;
  this.currencyPortfolioInitial = 101;
  this.currencyPortfolioTrading = this.currencyPortfolioInitial / 100 * this.currencyTradingLimitPercent;
  this.currencyGridStepAmountPercent = settings.grid_step_amount_percent;
  this.currencyGridStepAmount = this.currencyPortfolioTrading / 100 * this.currencyGridStepAmountPercent;
}

grid.placeInitialOrder = function(candle) {

}

grid.checkPriceChangesForOpenedOrdersAndCreateAdvice = function(candle) {
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
  if (priceChangePercent >= this.priceChangePercent) {
    this.currentPrice = candle.vwp;
    this.prevPrice = this.currentPrice;
    if (this.priceDirection == 'up') {
      console.log('\x1b[32m%s\x1b[0m', 'price change up ' + priceChangePercent + '% ');
    } else {
      console.log('\x1b[31m%s\x1b[0m', 'price change down ' + priceChangePercent + '% ');
    }
    return this.processOrdersAndCreateAdvice(this.currentPrice, this.priceDirection);
  }
};

grid.doesItMakeSenceToSellAssetAmountAtThisPrice = function(orderPrice, currentPrice) {
  if ((orderPrice + (orderPrice / 100 * this.minPercentOfProfit)) >= currentPrice) {
    return true;
  }
  return false;
}

grid.processOrdersAndCreateAdvice = function(price, direction) {
  var totalAssetAmountToSell = 0;
  var sellOrdersIds = [];
  if (direction == 'up') {
    _.each(
      _.filter(this.orders, (order) => {
        let doesIt = this.doesItMakeSenceToSellAssetAmountAtThisPrice(order.price, price);
        return order.status == 'opened' && doesIt;
      }, this), (order) => {
      totalAssetAmountToSell += order.assetAmount;
      order.status = 'closing';
      sellOrdersIds.push({id: order.id});
    });
    return this.createAdviceToSellAssetAndBuyNextAsset(totalAssetAmountToSell, price, sellOrdersIds);
  } else if (direction == 'down') {
    return this.createAdviceToBuyAmountOfAssetForOneGridStep(price);
  }
  return false;
}

grid.getAssetAmountForOneGridStep = function(assetPrice) {
  return this.currencyGridStepAmount / assetPrice;
}

grid.doWeHaveEnoughCurrency = function() {
  let currencyAmountLimit = (this.currencyPortfolioInitial - (this.currencyPortfolioInitial / 100 * this.currencyTradingLimitPercent));
  if (this.currencyPortfolioTrading > 0) {
    return true;
  }
  return false;
}

grid.createAdviceToBuyAmountOfAssetForOneGridStep = function(price) {
  let advice = {};
  if (this.doWeHaveEnoughCurrency()) {
    let orderId = this.generateOrderId();
    this.orders.push({
      id: orderId,
      status: 'opening',
      assetAmount: this.getAssetAmountForOneGridStep(price),
      price: price
    });
    advice.assetAmount = this.getAssetAmountForOneGridStep(price);
    advice.direction = 'long';
    advice.gridOrderId = orderId;
    return advice;
  }
  return false;
}

grid.createAdviceToSellAssetAndBuyNextAsset = function(totalAssetAmountToSell, price, sellOrdersIds) {
  let advice = {};
  if (totalAssetAmountToSell > 0) {
    advice.assetAmount = totalAssetAmountToSell;
    advice.direction = 'short';
    advice.gridOrdersIdsToSell = sellOrdersIds;
  }
  if (this.doWeHaveEnoughCurrency()) {
    let orderId = this.generateOrderId();
    this.orders.push({
      id: orderId,
      status: 'opening',
      assetAmount: this.getAssetAmountForOneGridStep(price),
      price: price
    });
    advice.nextDirection = 'long';
    advice.nextAssetAmount = this.getAssetAmountForOneGridStep(price);
    advice.nextGridOrderId = orderId;
  } else {
    console.log('SECO WARNING! We do not have Enough Currency to buy next amount of asset!');
  }
  if (advice.assetAmount == undefined && advice.nextAssetAmount == undefined) {
    return false;
  }
  return advice;
}

grid.generateOrderId = function() {
  this.orderIdCounter++;
  return 'grid-' + Date.now() + '-' + this.orderIdCounter;
}

// Let's create our own strat
var strat = {};
// set grid logic object
strat.grid = grid;
// Prepare everything our method needs
strat.init = function () {
  console.log('SECO Sedler Grid strategy init');
  this.input = 'candle';    
  this.grid.init(this.settings);
}

// What happens on every new candle?
//strat.update = function (candle) {
//}

// For debugging purposes.
strat.log = function () {
  log.debug('debug log..');
}

// SECO
// strat.check function called from 
// baseTradingMethod.js:Base.prototype.propogateTick
// -->calculateSyncIndicators()
//   -->tick()
// Based on the newly calculated information, check if we should update or not.
strat.check = function (candle) {
  
  if (!this.grid.initialOrderPlaced) {
    //console.log(this);
    let advice = this.grid.createAdviceToBuyAmountOfAssetForOneGridStep(candle.vwp);
    if (advice.assetAmount) {
      this.advice(advice);
      this.grid.initialOrderPlaced = true;
    }
  } else {
    let advice = this.grid.checkPriceChangesForOpenedOrdersAndCreateAdvice(candle);
    if (advice) {
      if (advice.assetAmount && advice.nextAssetAmount) {
        this.advice(advice);
        this.advice({
          assetAmount: advice.nextAssetAmount,
          direction: advice.nextDirection,
          gridOrderId: advice.nextGridOrderId
        });
      } else if (advice.assetAmount) {
        this.advice(advice);
      } else if (advice.nextAssetAmount) {
        this.advice({
          assetAmount: advice.nextAssetAmount,
          direction: advice.nextDirection,
          gridOrderId: advice.nextGridOrderId
        });
      }
    }
  }
}

strat.processTrade = function(trade) {
  console.log('[SECO Seddler Grid] trade comleted');
  console.log(trade);
}

strat.processPortfolioChange = function(portfolio) {
  console.log('portfolio change');
  console.log(portfolio);
  if (portfolio.portfolio) {
    this.portfolio = portfolio.portfolio;
  }
  console.log('this.portfolio = ' + this.portfolio);
  if (portfolio.currency) {
    this.currencyPortfolioTrading = portfolio.currency;
  }
}

module.exports = strat;
