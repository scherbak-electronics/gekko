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
  constructor(config, exchange) {
    super(config);
    this.files = [
      {
        name: 'logic.json',
        path: this.pairPath,
        createIfNotExist: true,
        propNames: [
          'lastStepPrice',
          'lastStepAskPrice',
          'tradingEnabled',
          'priceStepPcnt',
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
    this.console = new LogProxyClass(config, 'Trader Logic');
    this.balanceManager = new BalanceManager(this.config);
    
    this.price = 0;
    this.lastStepPrice = 0;
    this.lastStepAskPrice = 0;
    this.tradingEnabled = false;
    this.priceStepPcnt = 0;
    this.stepAmountPcnt = 0;
    this.stepCurrencyAmount = 10;
    this.buyOnlyIfGoesDownMode = false;
    this.sellOnlyMode = false;
    this.sellWholeBalance = false;
    this.sellIfGreater = false;
    this.candleSize = 1;
    this.chartDateRangeDays = 1;
    this.minimumCurrencyAmount = 10;
    this.stepCurrencyAmount = this.minimumCurrencyAmount;
    this.createNewFilesIfNotExist();
    this.readData();
    this.writeData('tradingEnabled', false);
  }

  setPrices(ticker) {
    this.askPrice = ticker.ask;
    this.bidPrice = ticker.bid;
  }
  /**
   * compares current price candle close price with 
   * opened orders asset prices to find orders where 
   * price is one step percents lower
   * than market current price. 
   * It returns decision object with orders we can sell
   * at this price and get step percent of profit
   * 
   * @param {*} candle 
   * @param {*} orders 
   * @returns {*}
   */
  checkOrdersPriceAndMakeDecision(ticker, orders) {
    let res;
    let decision = {};
    decision.side = false;
    decision.orders = [];
    this.setPrices(ticker);
    this.readData();
    this.readData('lastStepPrice');
    if (orders && orders.length) {
      _.each(orders, (order) => {
        if (order.isEnabled === true) {
          //this.console.log('Checking order price: | %s | %s | %s', order.amountAsset, order.price, moment(order.time).format('YYYY-MM-DD HH:mm'));
          this.debugOrderId = order.id;
          res = this.checkStepPriceLevel(this.bidPrice, order.price);
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
          if (res === 'up' || res === 'down') {
            this.writeData('lastStepPrice', this.bidPrice);
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
   * compares current price candle close price with 
   * last time step percent change, and returns decision object
   * which defines what to do depending on settings configuration.
   * 
   * @param {*} candle 
   * @returns {*}
   */
  checkPriceAndMakeDecision(ticker) {
    let decision = {};
    decision.side = undefined;
    decision.orders = [];
    this.setPrices(ticker);
    this.readData();
    //this.console.log('checking price (%s) with last time price (%s) ...', this.askPrice, this.lastStepAskPrice);
    decision.priceStepChangeDir = this.checkStepPriceLevel(this.askPrice, this.lastStepAskPrice);
    if (decision.priceStepChangeDir === 'up' || decision.priceStepChangeDir === 'down') {
      if (this.sellOnlyMode) {
        // doing nothing...
        this.console.log('Sell only mode. doing nothing here...'.grey);
      } else {
        if (this.buyOnlyIfGoesDownMode) {
          this.console.log('Buy only if goes down mode.'.grey);
          if (decision.priceStepChangeDir === 'down') {
            this.console.log('making decision to buy if goes down!');
            decision.side = 'buy';
          }
        } else {
          this.console.log('making decision to buy! ');
          decision.side = 'buy';
        }
      }
      this.writeData('lastStepAskPrice', this.askPrice);
    }
    return decision;
  }

  checkStepPriceLevel(price, lastStepPrice) {
    let priceDiffPcnt = this.getPriceDiffPcnt(price, lastStepPrice); 
    if (priceDiffPcnt > 0) {
      if (priceDiffPcnt >= this.priceStepPcnt) {
        if (this.debugOrderId) {
          this.console.log('+%s% %s', Number(priceDiffPcnt).toFixed(3), this.debugOrderId);
        } else {
          this.console.log('+%s%', Number(priceDiffPcnt).toFixed(3));
        }
        return 'up';
      }
      //this.console.log('+%s%'.grey, Number(priceDiffPcnt).toFixed(3));
      return 'gt';
    } else if (priceDiffPcnt < 0) {
      if (-priceDiffPcnt >= this.priceStepPcnt) {
        if (!this.debugOrderId) {
          this.console.log('%s%', Number(priceDiffPcnt).toFixed(3));
        }
        return 'down';
      }
      //this.console.log('%s%'.grey, Number(priceDiffPcnt).toFixed(3));
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

  getTradingAvailableCurrencyAmount() {
    return this.balanceManager.getTradingAvailableCurrencyAmount();
  }

  getStepCurrencyAmount() {
    this.readData();
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
    let currencyBalanceAmount = this.balanceManager.getTradingAvailableCurrencyAmount();
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
    if (assetBalanceAmountCurrency >= this.minimumCurrencyAmount) {
      this.console.log('whole asset balance: %s (%s$)'.grey, assetBalanceAmount, assetBalanceAmountCurrency);
      return assetBalanceAmount;
    } else {
      return false;
    }
  }
}

module.exports = TraderLogic;