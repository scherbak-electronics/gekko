/*
 *  SECO
 *  
 *  Trader logic
 * checking orders and market price
 * and make decision
 */
const _ = require('lodash');
var util = require('../../core/util');
const config = util.getConfig();
const moment = require('moment');
var logic = {};
logic.init = function(config) {
  console.trace('Logic init...');
  this.lastCheckPrice = 0;
}

/*
 * Returns one of possible decisions which are:
 * buy | sell | sell_and_buy 
 */
logic.checkPriceAndMakeDecision = function(candle) {
  return  '';//'buy';
}

logic.checkPriceGridAndOrders = function(candle, orders, grid) {
  let res = undefined;
  let priceMove = undefined;
  let priceDiffPcnt = this.getPriceDiffPcnt(candle.close, this.lastCheckPrice);
  if (priceDiffPcnt > 0) {
    priceMove = 'up';
  } else {
    priceMove = 'down';
    priceDiffPcnt = -priceDiffPcnt;
  }
  if (priceDiffPcnt >= grid.priceStepPcnt) {
    this.lastCheckPrice = candle.close;
  }
  _.each(grid.levels, (priceLevel) => {
    if (candle.close >= priceLevel.price) {
      //console.log('checking price: candle.close >= priceLevel.price ', candle.close);
      // check if there are no already opened orders
      // check where price goes, up or down if up and we have amount to sell then SELL it
      // if we have no amount then BUY it (for the first time)
      // if price goes down and we have enought currency then BUY amount 
    }
  });
  return res;
}

logic.getPriceDiffPcnt = function(newPrice, oldPrice) {
  let priceDiffPercent = 0;
  if (newPrice > oldPrice) {
    priceDiffPercent = ((newPrice - oldPrice) / oldPrice) * 100;
    return priceDiffPercent;
  } else {
    priceDiffPercent = ((oldPrice - newPrice) / oldPrice) * 100;
    return -priceDiffPercent;
  }
}

logic.checkOrders = function(candle, orders, grid) {
  let result = {};
  result.ordersToSell = [];
  _.each(orders, (order) => {
    if (order.side === 'BUY') {
      if (order.status === states.FILLED) {
        let gridStepPriceDiff = this.getPcntOfAmount(order.price, grid.priceStepPcnt);
        if (candle.close > (order.price + gridStepPriceDiff)) {
          // now we can sell asset
          result.ordersToSell.push(order);
        }
      }
    }
  });
  return result;
}

logic.getPcntOfAmount = function(amount, pcntOfAmount) {
  let resultAmount = (amount / 100) * pcntOfAmount;
  return resultAmount;
}

logic.hasEnoughCurrency = function(balances) {
  return true;
}

logic.hasEnoughAsset = function(balances) {
  return true;
}

logic.getAmountOfAssetToBuy = function() {
  return 1;
}

module.exports = logic;