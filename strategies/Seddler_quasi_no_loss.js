/* 
 * SEKO
 * Scherbak Electronics
 * 
 * Seddler quasi-lossless strategy for SECO.
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
  
  this.singleOrder = undefined;
  this.minProfitChecked = false;
  this.candleBuffer = [];
  this.prevPriceDir;
   
  this.lastDetectedPrice = 0;
  this.priceDiffCapacitor = 0;
  this.priceFallDetected = false;
  this.entryPointDetected = false;
  this.exitPointDetected = false;
  this.orderIdCounter = 0;

  this.currencyPortfolioInitial = 101;
  this.currencyPortfolioTrading = this.currencyPortfolioInitial;
  this.currencyTradingAmountPercent = settings.trading_amount_percent;
  this.priceFallPercent = settings.price_fall; 
  this.minPercentOfProfit = settings.min_percent_of_profit;  
}

grid.addToCandleBuffer = function(candle) {
  this.candleBuffer.push(candle);
}

grid.getCandleBufferLast = function() {
  return this.candleBuffer[this.candleBuffer.length - 1];
}

grid.getCandleBufferLast2 = function() {
  return this.candleBuffer[this.candleBuffer.length - 2];
}

grid.detectExitPoint = function(candle) {
  let priceGrow = this.getPriceDiffPercent(this.singleOrder.price, candle.close);
  if (!this.minProfitChecked) {
    if (priceGrow >= this.minPercentOfProfit) {
      this.minProfitChecked = true;
      console.log(priceGrow + '% of Minimum profit can be taken.');
    } else if (priceGrow < 0) {
      if (priceGrow > -2) {
        console.log(priceGrow + '% of losses detected. advice - just WAIT. need solution here!');
      } 
      if (priceGrow < -4) {
        return true;
      }
    }
  } else {
    if (candle.close < candle.open) {
      if (candle.close < this.getCandleBufferLast().close) {
        if (this.getCandleBufferLast().close > this.getCandleBufferLast().open) {
          this.exitPointDetected = true;
          console.log('Exit point detected');
          return true;
        }
      }
    }
  }
  return false;
}

grid.detectEntryPoint = function(candle) {
  // PHASE ONE
  if (!this.priceFallDetected) {
    let priceDiff = this.getPriceDiffPercent(this.lastDetectedPrice, candle.close); 
    candle.priceDiff = priceDiff;
    this.lastDetectedPrice = candle.close;
    let priceDir;
    if (priceDiff < 0) {
      priceDiff = -priceDiff;
      priceDir = 'fall';
      this.priceDiffCapacitor += priceDiff;
    } else {
      priceDir = 'rise';
      this.priceDiffCapacitor -= priceDiff;
    }
    if (this.prevPriceDir != priceDir) {
      this.prevPriceDir = priceDir;
      //console.log('price direction ' + priceDir);
      this.addCandleMarker(candle, {
        position: 'belowBar',
        color: '#000000',
        shape: 'circle',
        text: priceDir
      });
    }
    if ((-this.getLastCandlesTotalChange(5)) >= this.priceFallPercent) {
      this.priceDiffCapacitor = 0;
      if (priceDir == 'fall') {
        
        this.addCandleMarker(candle, {
          position: 'belowBar',
          color: '#000000',
          shape: 'circle',
          text: '∆ƒ = ' + Number((this.getLastCandlesTotalChange(5)).toFixed(2)) + '%'
        });
        
        console.log('price diff -' + priceDiff);
        if (candle.close > candle.open) {   // ------------- -  --   - - - -- -  ----  ----| candle pattern
          if (this.getCandleBufferLast().close > this.getCandleBufferLast().open) { // - --| detection
            if (this.getCandleBufferLast2().close < this.getCandleBufferLast2().open) {
              this.priceFallDetected = true;
              this.priceDiffCapacitor = 0;
              console.log(priceDiff + '% Price fall detected');
            }
          }
        }
      }
    } else if (this.priceDiffCapacitor < 0 && priceDir == 'rise') {
      this.priceDiffCapacitor = 0;
    }
  }
  // PHASE TWO
  if (this.priceFallDetected) {
    if (candle.close > candle.open) {
      candle.markerCandleSize = this.getPriceDiffPercent(candle.close, candle.open); 
      if (candle.close > this.getCandleBufferLast().close) {
        this.entryPointDetected = true;
        console.log('Entry point detected. c=' + candle.close + ' o=' + candle.open);
        return true;
      }
    }
  }
  return false;
}

grid.detectFallingEdge = function(candle) {

}

grid.findSmallestCandle = function() {

}

grid.findBiggestCandle = function() {

}

grid.getCandleSize = function(candle) {
  if (candle.close < candle.open) {
    return candle.open - candle.close;
  } else {
    return candle.close - candle.open;
  }
}

grid.getCandleType = function(candle) {
  let candleType = undefined;
  if (candle.close < candle.open) {
    candleType = 'falling';
  } else {
    candleType = 'rising';
  }
  let diff = this.getPriceDiffPercent(candle.close, candle.open); 
  if (diff < 0) {
    diff = -diff;
  }
  if (diff > 0.3) {
    candleType += '_big';
  } else if (diff < 0.1) {
    candleType += '_small';
  }
  return candleType;
}

grid.getLastCandlesTotalChange = function(num) {
  var accum = 0;
  for (var ind = 0; ind < num; ind++) {
    let close = this.candleBuffer[(this.candleBuffer.length - 1) - ind].close;
    let preClose = this.candleBuffer[(this.candleBuffer.length - 2) - ind].close;
    accum += this.getPriceDiffPercent(preClose, close); 
  }
  return accum;
}

grid.detectRisingCandle = function(candle) {
  if (candle.close > candle.open) {
    if (candle.close > this.getCandleBufferLast().close) {
      return true;
    }
  }
  return false;
}

grid.analyseAndMakeDecision = function(candle) {
  var advice = undefined;
  if (!this.buyOrderCreated()) {
    // PHASE ONE - detect entry point
    // when we going to buy
    if (!this.entryPointDetected) {
      let result = this.detectEntryPoint(candle);
      if (result) {
        advice = this.createAdviceToBuyAmountOfAssetForOneGridStep(candle.close);
        console.log('\x1b[32m%s\x1b[0m', 'BUY advice');
      }  
    }   
  } else {
    // PHASE TWO - detect exit point
    // find the best moment to sell
    if (this.entryPointDetected && !this.exitPointDetected) {
      let result = this.detectExitPoint(candle);
      if (result) {
        advice = this.createAdviceToSellOpenedAsset();
        console.log('\x1b[31m%s\x1b[0m', 'SELL advice');
      }
    }
  }
  return advice;
}

grid.addCandleMarker = function(candle, marker) {
  let sampleMarker = {
    time: candle.date,
    position: 'belowBar', // (aboveBar | belowBar | inBar) - item position
    shape: 'arrowUp', // (circle | square | arrowUp | arrowDown) - item marker type
    size: 1, // (number | undefined) - size multiplier of the marker, the shape is hidden when set to 0, default value is 1
    color: '#1111dd', // (string) - item color
    //id: markerId, // (string | undefined) - item id, will be passed to click/crosshair move handlers
    text: 'X' // (string | undefined) - item text to be shown
  };
  if (marker.text) {
    let spaces = new Array(marker.text.length);
    spaces = spaces.fill(' ', 0, spaces.length - 1);
    spaces = spaces.join('');
    marker.time = candle.start.unix();
    marker.text = spaces + marker.text;
  }
  if (candle.markers && candle.markers.length) {
    candle.markers.push(marker);
  } else {
    candle.markers = [];
    candle.markers.push(marker);
  }
}

grid.buyOrderCreated = function() {
  if (this.singleOrder) {
    if (this.singleOrder.status == 'opening' || this.singleOrder.status == 'opened') {
      return true;
    }
  }
  return false;
}

grid.getAssetAmountForTrading = function(assetPrice) {
  let currencyTradingAmount = this.currencyPortfolioTrading / 100 * this.currencyTradingAmountPercent;
  return currencyTradingAmount / assetPrice;
}

grid.getPriceDiffPercent = function(orderPrice, currentPrice) {
  /*
  If the price increased, use the formula [(New Price - Old Price)/Old Price] 
  and then multiply that number by 100. If the price decreased, 
  use the formula [(Old Price - New Price)/Old Price] and multiply that number by 100.
  */
  let priceDiffPercent = 0;
  if (orderPrice < currentPrice) {
    priceDiffPercent = ((currentPrice - orderPrice) / orderPrice) * 100;
  } else {
    priceDiffPercent = ((orderPrice - currentPrice) / orderPrice) * 100;
    priceDiffPercent *= -1;
  }
  return priceDiffPercent;
}

grid.doWeHaveEnoughCurrency = function() {
  if (this.currencyPortfolioTrading > 1) {
    return true;
  }
  return false;
}

grid.createAdviceToBuyAmountOfAssetForOneGridStep = function(price) {
  let advice = {};
  if (this.doWeHaveEnoughCurrency()) {
    console.log('advice going to BUY created');
    this.singleOrder = {};
    this.singleOrder.id = this.generateOrderId();
    this.singleOrder.status = 'opening';
    this.singleOrder.assetAmount = this.getAssetAmountForTrading(price);
    this.singleOrder.price = price;
    advice.assetAmount = this.getAssetAmountForTrading(price);
    advice.direction = 'long';
    advice.gridOrderId = this.singleOrder.id;
    return advice;
  }
  console.log('we Dont have enough Currency');
  return false;
}

grid.createAdviceToSellOpenedAsset = function() {
  let advice = {};
  console.log('create advice to SELLL');
  advice.assetAmount = this.singleOrder.assetAmount;
  advice.direction = 'short';
  advice.gridOrderId = this.singleOrder.id;
  this.singleOrder.status = 'closing';
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
  this.startTime = new Date();
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
  if (this.grid.candleBuffer.length > 12) {
    let advice = this.grid.analyseAndMakeDecision(candle);
    if (advice) {
      this.advice(advice);
    }
  } else {
    this.grid.lastDetectedPrice = candle.close;
  }
  this.grid.addToCandleBuffer(candle);
}

strat.processTrade = function(trade) {
  let isOpening = this.grid.singleOrder && this.grid.singleOrder.status == 'opening';
  let isClosing = this.grid.singleOrder && this.grid.singleOrder.status == 'closing';
  if (isOpening) {
    console.log('new tradeing order opening...');
    this.grid.singleOrder.status = 'opened';
  }
  if (isClosing) {
    console.log('opened trading order closing...');
    this.grid.singleOrder.status = 'closed';
    this.grid.minProfitChecked = false;
    this.grid.priceFallDetected = false;
    this.grid.entryPointDetected = false;
    this.grid.exitPointDetected = false;
    this.grid.priceDiffCapacitor = 0;
  }
}

strat.processPortfolioChange = function(portfolio) {
  if (portfolio.portfolio) {
    //this.grid.portfolio = portfolio.portfolio;
  }
  if (portfolio.currency) {
    this.grid.currencyPortfolioTrading = portfolio.currency;
    console.log('currencyPortfolioTrading = ' + this.grid.currencyPortfolioTrading); 
  }
}

module.exports = strat;
