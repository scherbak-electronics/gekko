/*
 *  SECO
 *  
 *  Grid strategy logic
 */
const _ = require('lodash');
var util = require('../../core/util');
const config = util.getConfig();
const moment = require('moment');

var logic = {};
logic.init = function(settings) {
  if (config.tradebotPipelineId) {
    this.pipelineId = config.tradebotPipelineId;
  }
  this.trend = '';
  this.grid = {};
  this.spotOrders = {};
  this.grid = util.loadGridJsonFile(config.watch);
  console.log('logic.init this.emitUpdatePriceGrid(this.grid);');
  this.emitUpdatePriceGrid(this.grid);
  this.spotOrders = util.loadSpotOrdersJsonFile(config.watch);
}

logic.checkPriceGridAndOrders = function(candle) {
  let res = undefined;
  _.each(this.grid.levels, (priceLevel) => {
    if (candle.close >= priceLevel.price) {
      if (this.trend == 'up') {
        let spotOrdersRes = this.checkOpenedSpotOrders(candle);
        if (spotOrdersRes) {

        }
      } else if (this.trend == 'down') {
        let amountCheckRes = this.checkAvailableCurrency(candle);
        if (amountCheckRes) {
          
        }
      }
    } else {
      if (this.trend == 'down') {
        let amountCheckRes = this.checkAvailableCurrency(candle);
        if (amountCheckRes) {
          
        }
      }
    }
  });
  
  return res;
}

logic.checkOpenedSpotOrders = function(candle) {
  let res = undefined;
  return res;
}

logic.checkAvailableCurrency = function(candle) {
  let res = undefined;
  return res;
}

module.exports = logic;