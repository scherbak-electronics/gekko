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
var logic = require('./SE_Peak_Detector/logic.js');




// Let's create our own strat
var strat = {};
strat.logic = logic;
// Prepare everything our method needs
strat.init = function () {
  this.startTime = new Date();
  console.log('SECO Sedler Grid strategy init');
  this.input = 'candle';    
  this.logic.init(this.settings);
}

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
  if (this.logic.getCandleBufferLength() > 60) {
    let advice = this.logic.analyseAndMakeDecision(candle);
    if (advice) {
      this.advice(advice);
    }
  } else {
    this.logic.lastDetectedPrice = candle.close;
  }
  this.logic.addToCandleBuffer(candle);
}

strat.processTrade = function(trade) {
  let isOpening = this.logic.singleOrder && this.logic.singleOrder.status == 'opening';
  let isClosing = this.logic.singleOrder && this.logic.singleOrder.status == 'closing';
  if (isOpening) {
    console.log('new tradeing order opening...');
    this.logic.singleOrder.status = 'opened';
  }
  if (isClosing) {
    console.log('opened trading order closing...');
    this.logic.singleOrder.status = 'closed';
    this.logic.minProfitChecked = false;
    this.logic.priceFallDetected = false;
    this.logic.entryPointDetected = false;
    this.logic.exitPointDetected = false;
    this.logic.priceDiffCapacitor = 0;
  }
}

strat.processPortfolioChange = function(portfolio) {
  if (portfolio.portfolio) {
    //this.logic.portfolio = portfolio.portfolio;
  }
  if (portfolio.currency) {
    this.logic.currencyPortfolioTrading = portfolio.currency;
    console.log('currencyPortfolioTrading = ' + this.logic.currencyPortfolioTrading); 
  }
}

module.exports = strat;
