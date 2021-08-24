/**
 * SECO 
 * (how banking system works)
 *  
 * Trader logic
 * checking orders and market price, calculates step amounts,
 * checking and updating deposit balance state,
 * controls trading process modes, 
 * and make decision
 */
const _ = require('lodash');
const util = require('../../../core/util');
const moment = require('moment');
var colors = require('colors');
const BalanceManager = require('../balance-manager');
const LogProxyClass = require('../../../core/log-proxy');


class InvertedAccumulation {
   constructor(config, exchange, orderManager) {
    this.config = config;
    this.exchange = exchange;
    this.orderManager = orderManager;
    this.console = new LogProxyClass(config, 'Trader Inv. Logic');
    this.balanceManager = new BalanceManager(this.config);
    this.lastStepBidPrice = 0;
    this.lastStepAskPrice = 0;
    this.stepCurrencyAmount = 0;
   }

   setPrices(ticker) {
    this.askPrice = ticker.ask;
    this.bidPrice = ticker.bid;
  }

   checkOrdersPriceAndMakeDecision(orders) {
    let res;
    let decision = {};
    decision.side = false;
    decision.orders = [];
    if (orders && orders.length) {
      _.each(orders, (order) => {
        if (order.isEnabled === true) {
          //this.console.log('Checking order price: | %s | %s | %s', order.amountAsset, order.price, moment(order.time).format('YYYY-MM-DD HH:mm'));
          this.debugOrderId = order.id;
          res = this.checkOrderPrice(order.price);
          this.debugOrderId = undefined;
          if (res === 'up') {
            //this.console.log('found order we can sell..'.bold.yellow);
            decision.orders.push(order);
          } else if (res === 'down') {
            //this.console.log('Unable to sell this order, its price is too high!'.red);
          } else if (res === 'gt') {
            if (this.sellIfGreater) {
              this.console.log('%s price lower then current price', order.id);
              decision.orders.push(order);
            }
          }
        }
      });
      if (decision.orders.length > 0) {
        this.console.log('found %s orders for sale..'.grey, decision.orders.length);
        if (this.sellOnlyMode || this.buyOnlyIfGoesDownMode) {
          decision.side = 'sell';
        } else {
          decision.side = 'sell_and_buy';
        }
      }
    } else {
      let assetAmount = this.balanceManager.getAssetAmount();
      let assetAmountCurrency = assetAmount * this.bidPrice;
      if (assetAmountCurrency >= this.minimumCurrencyAmount) {
        if (this.sellOnlyMode && this.sellWholeBalance) {
          decision.side = 'sell_whole_balance';
        }
      }
    }
    return decision;
  }

  /**
   * waiting for price high enough to create SELL order
   * compares current bid price with the last step bid price
   * how much percent change, and returns decision object
   * which defines what to do depending on settings configuration.
   * 
   * @returns {*}
   */
  checkPriceAndMakeDecision() {
    let decision = {};
    decision.side = undefined;
    decision.orders = undefined;
    //this.console.log('checking price (%s) with last time price (%s) ...', this.askPrice, this.lastStepAskPrice);
    decision.priceGoes = this.checkStepPrice();
    if (decision.priceGoes === 'up' || decision.priceGoes === 'down') {
      if (decision.priceGoes === 'up') {
        decision.side = 'sell_inv';
        decision.assetAmount = this.getStepAssetAmount();
      }
    }
    return decision;
  }

  checkStepPrice() {
    let priceDiffPcnt = this.getPriceDiffPcnt(this.askPrice, this.lastStepAskPrice);
    if (priceDiffPcnt < 0) {
      if (-priceDiffPcnt >= this.priceStepDownPcnt) {
        this.lastStepAskPrice = this.askPrice;
        this.lastStepBidPrice = this.bidPrice;
        return 'down';
      }
    }
    priceDiffPcnt = this.getPriceDiffPcnt(this.bidPrice, this.lastStepBidPrice);
    if (priceDiffPcnt > 0) {
      if (priceDiffPcnt >= this.priceStepUpPcnt) {
        this.lastStepBidPrice = this.bidPrice;
        this.lastStepAskPrice = this.askPrice;
        return 'up';
      }
    }
    return false;
  }

  checkOrderPrice(orderPrice) {
    let priceDiffPcnt = this.getPriceDiffPcnt(this.bidPrice, orderPrice);
    if (priceDiffPcnt > 0) {
      if (priceDiffPcnt >= this.priceStepUpPcnt) {
        return 'up';
      }
      return 'gt'
    }
    if (priceDiffPcnt < 0) {
      if (-priceDiffPcnt >= this.priceStepDownPcnt) {
        return 'down';
      }
      return 'lt'
    }
    return false;
  }

  getPriceDiffPcnt(newPrice, oldPrice) {
    return util.getHowBiggerInPcnt(newPrice, oldPrice);
  }

  getStepAssetAmount() {
    let stepAssetAmount = 0
    if (this.askPrice > 0) {
      stepAssetAmount = this.stepCurrencyAmount / this.askPrice;
    }
    this.console.log('stepAssetAmount: '.grey, stepAssetAmount);
    return stepAssetAmount;
  }
} 
module.exports = InvertedAccumulation;