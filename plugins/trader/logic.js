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
const util = require('../../core/util');
const moment = require('moment');
var colors = require('colors');
const BalanceManager = require('./balance-manager');
const LogProxyClass = require('../../core/log-proxy');
const BaseModule = require('../../core/seco/base-module');

class TraderLogic extends BaseModule {
  constructor(config, exchange, orderManager) {
    super(config);
    this.files = [
      {
        name: 'logic.json',
        path: this.pairPath,
        createIfNotExist: true,
        propNames: [
          'lastStepBidPrice',
          'lastStepAskPrice',
          'tradingEnabled',
          'averagingEnabled',
          'priceStepUpPcnt',
          'priceStepDownPcnt',
          'stepAmountPcnt',
          'stepCurrencyAmount',
          'buyOnlyIfGoesDownMode',
          'sellOnlyMode',
          'sellWholeBalance',
          'sellIfGreater',
          'candleSize',
          'chartDateRangeDays'
        ]
      }
    ];
    this.exchange = exchange;
    this.orderManager = orderManager;
    this.console = new LogProxyClass(config, 'Trader Logic');
    this.balanceManager = new BalanceManager(this.config);
    this.lastStepBidPrice = 0;
    this.lastStepAskPrice = 0;
    this.tradingEnabled = false;
    this.averagingEnabled = false;
    this.priceStepUpPcnt = 0;
    this.priceStepDownPcnt = 0;
    this.priceStepDownCounter = 0;
    this.stepAmountPcnt = 0;
    this.stepCurrencyAmount = 11.5;
    this.buyOnlyIfGoesDownMode = false;
    this.sellOnlyMode = false;
    this.sellWholeBalance = false;
    this.sellIfGreater = false;
    this.candleSize = 1;
    this.chartDateRangeDays = 1;
    this.minimumCurrencyAmount = 10;
    this.createNewFilesIfNotExist();
    this.readData();
    this.writeData('tradingEnabled', false);
  }

  initLastPrices() {
    if (this.lastStepBidPrice === 0) {
      this.console.log('initialize and save last step bid price...');
      this.lastStepBidPrice = this.bidPrice;
    }
    if (this.lastStepAskPrice === 0) {
      this.console.log('initialize and save last step ask price...');
      this.lastStepAskPrice = this.askPrice;
    }
  }

  setPrices(ticker) {
    this.askPrice = ticker.ask;
    this.bidPrice = ticker.bid;
  }

  checkAllAndMakeDecision() {
    let orders = this.orderManager.getOpenedMarketTypeOrders();
    let decision = this.checkOrdersPriceAndMakeDecision(orders);
    if (decision.side === false) {
      return this.checkPriceAndMakeDecision();
    }
    return decision;
  }

  /**
   * compares current price candle close price with 
   * opened orders asset prices to find orders where 
   * price is one step percents lower
   * than market current price. 
   * It returns decision object with orders we can sell
   * at this price and get step percent of profit
   * 
   * @param {*} orders 
   * @returns {*}
   */
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
          decision.assetAmount = this.getStepAssetAmount();
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
   * compares current ask price with last step ask price
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
      if (this.sellOnlyMode) {
        // doing nothing...
        this.console.log('Sell only mode. doing nothing here...'.grey);
      } else {
        if (this.buyOnlyIfGoesDownMode) {
          this.console.log('Buy only if goes down mode.'.grey);
          if (decision.priceGoes === 'down') {
            this.console.log('making decision to buy if goes down!');
            decision.side = 'buy';
            decision.assetAmount = this.getStepAssetAmount();
          }
        } else {
          this.console.log('making decision to buy! ');
          decision.side = 'buy';
          decision.assetAmount = this.getStepAssetAmount();
        }
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
    let priceDiffPercent = 0;
    if (newPrice > oldPrice) {
      priceDiffPercent = ((newPrice - oldPrice) / oldPrice) * 100;
      return priceDiffPercent;
    } else {
      priceDiffPercent = ((oldPrice - newPrice) / oldPrice) * 100;
      return -priceDiffPercent;
    }
  }

  getPcntOfAmount(amount, pcntOfAmount) {
    let resultAmount = (amount / 100) * pcntOfAmount;
    return resultAmount;
  }

  getStepCurrencyAmount() {
    this.console.log('stepCurrencyAmount: '.grey, this.stepCurrencyAmount);
    return this.stepCurrencyAmount;
  }

  getStepAssetAmount() {
    let stepCurrencyAmount = this.getStepCurrencyAmount();
    let stepAssetAmount = 0
    if (this.askPrice > 0) {
      stepAssetAmount = stepCurrencyAmount / this.askPrice;
    }
    this.console.log('stepAssetAmount: '.grey, stepAssetAmount);
    return stepAssetAmount;
  }

  hasEnoughCurrencyToBuy(assetAmount) {
    let currencyBalanceAmount = this.balanceManager.getTradingCurrencyAmountAvailable();
    let totalPriceInCurrency = assetAmount * this.askPrice;
    this.console.log('totalPriceInCurrency: '.grey, totalPriceInCurrency);
    if (currencyBalanceAmount > totalPriceInCurrency) {
      return true;
    } else {
      return false;
    }
  }

  hasEnoughAssetToSell(assetAmount) {
    let assetBalanceAmount = this.balanceManager.getAssetAmount();
    this.console.log('assetBalanceAmount: %s (%s$)'.grey, assetBalanceAmount, (assetBalanceAmount * this.bidPrice));
    if (assetBalanceAmount >= assetAmount) {
      return true;
    } else {
      return false;
    }
  }

  getEnoughAssetAmountToSellWholeBalance() {
    let assetBalanceAmount = this.balanceManager.getAssetAmount();
    let assetBalanceAmountCurrency = assetBalanceAmount * this.bidPrice;
    this.console.log('whole asset balance: %s (%s$)'.grey, assetBalanceAmount, assetBalanceAmountCurrency);
    if (assetBalanceAmountCurrency >= this.minimumCurrencyAmount) {
      return assetBalanceAmount;
    } else {
      return false;
    }
  }
}

module.exports = TraderLogic;