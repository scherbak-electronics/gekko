/* 
 * SEKO
 * Scherbak Electronics  
 * SE_Grid strategy for SECO.
 */
const _ = require('lodash');
var log = require('../core/log');
var config = require('../core/util.js').getConfig();
var logic = require('./SE_Grid/logic');
var strat = {};
strat.logic = logic;
strat.init = function () {
  console.log('SE Grid strategy init');
  //console.log(config);
  this.input = 'candle'; 
  
  this.logic.addChartLine = this.addChartLine;
  this.logic.addChartPriceLine = this.addChartPriceLine;
  this.logic.addChartMarker = this.addChartMarker;
  this.logic.emitUpdatePriceGrid = this.emitUpdatePriceGrid;
  console.log('this.logic.emitUpdatePriceGrid = this.emitUpdatePriceGrid;');
  this.logic.init(this.settings);
}

strat.log = function () {
  log.debug('debug log..');
}

strat.check = function (candle) {
  if (candle == undefined) {
    return;
  }
}

strat.processTrade = function(trade) {
  
}

strat.processPortfolioChange = function(portfolio) {
  
}

module.exports = strat;
