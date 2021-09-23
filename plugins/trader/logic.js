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
          'chartDateRangeDays',
          'autoDisableSellOnlyMode',
          'logCheckPriceEnabled',
          'logAmountsEnabled'
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
    this.autoDisableSellOnlyMode = false;
    this.candleSize = 1;
    this.chartDateRangeDays = 1;
    this.minimumCurrencyAmount = 10;
    this.logCheckPriceEnabled = true;
    this.logAmountsEnabled = true;
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
    let decision = {};
    let orders = this.orderManager.getEnabledOpenedMarketOrders();
    decision = this.checkOrdersPriceAndMakeDecision(orders);
    if (this.orderManager.openedBuyOrderIds && this.orderManager.openedBuyOrderIds.length) {
      this.console.log('%s opened orders found'.bold.yellow, this.orderManager.openedBuyOrderIds.length);
    } else {
      if (!decision.openedOrdersFound) {
        this.console.log('no opened orders. its clear to BUY one.'.bold.yellow);
        decision = this.checkPriceAndMakeDecision();
      }
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
    let decision = {};
    decision.side = false;
    decision.orders = [];
    decision.openedOrdersFound = false;
    decision.assetAmount = 0;
    decision.sellAvgOrders = false;
    let lastOpenedBuyOrderId = this.orderManager.readData('lastOpenedBuyOrderId');
    if (orders && orders.length) {
      decision.openedOrdersFound = true;
      this.console.log('%s opened orders found'.grey, orders.length);
      let lastBuyOrder = _.find(orders, (lastOrder) => {
        if (lastOrder.id == lastOpenedBuyOrderId) {
          return true;
        }
      });
      if (lastBuyOrder) {
        this.console.log('last'.grey, lastBuyOrder.id);  
        decision.priceGoes = this.checkOrderPrice(lastBuyOrder.price);
        if (decision.priceGoes === 'down') {
          if (!this.sellOnlyMode) {
            decision.assetAmount = Number(lastBuyOrder.amountAsset) * 2;
            decision.side = 'buy';
            this.console.log('DOWN: averaging BUY %s x 2 = %s'.bold.yellow, lastBuyOrder.amountAsset, decision.assetAmount);
          }
        } else if (decision.priceGoes === 'up') {
          decision.orders.push(lastBuyOrder);
          decision.side = 'sell_and_buy';
          decision.assetAmount = this.getStepAssetAmount();
          this.console.log('UP: last avg order %s can be SOLD and buy new'.grey, lastBuyOrder.id);  
          decision.sellAvgOrders = true;
        }
        if (this.lastStepAskPrice != lastBuyOrder.price) {
          this.lastStepAskPrice = lastBuyOrder.price;
        }
      }
      _.each(orders, (order) => {
        if (lastBuyOrder && order.id == lastBuyOrder.id) {
          this.console.log('last: %s'.grey, lastBuyOrder.id);
        } else {
          this.console.log('related avg: %s'.grey, order.id);
          //this.console.log('Checking order price: | %s | %s | %s', order.amountAsset, order.price, moment(order.time).format('YYYY-MM-DD HH:mm'));
          this.debugOrderId = order.id;
          decision.priceGoes = this.checkOrderPrice(order.price);
          this.debugOrderId = undefined;
          if (decision.priceGoes === 'up') {
            decision.orders.push(order); 
            this.console.log('UP: found order %s for SELL'.grey, order.id);
          } else if (decision.priceGoes === 'down') {
            if (decision.sellAvgOrders) {
              this.console.log('DOWN: add order %s to SELL as avg'.grey, order.id);
              decision.orders.push(order);
            }
          } else if (decision.sellAvgOrders) {
              this.console.log('SELL order %s anyway'.grey, order.id);
              decision.orders.push(order);
          }
        } 
      });
      if (decision.orders.length > 0) {
        this.console.log('found %s orders for sale'.grey, decision.orders.length);
        if (decision.side === 'buy') {
          this.console.log('and one avg. buy %s of asset'.grey, decision.assetAmount);
          decision.side = 'sell_and_buy';
        } else if (decision.side === 'sell_and_buy') {
          if (this.sellOnlyMode) {
            this.console.log('sell only mode enabled'.grey);
            decision.side = 'sell';
          } else {
            this.console.log('including one avg. order %s to sell %s of asset'.grey, lastBuyOrder.id, lastBuyOrder.amountAsset);
          }
        } else if (decision.side === false) {
          this.console.log('no last buy order found'.grey);
          if (this.sellOnlyMode) {
            this.console.log('sell only mode enabled'.grey);
            decision.side = 'sell';
          } else {
            decision.side = 'sell_and_buy';
          }
        }
      }
      if (decision.priceGoes === 'down' || decision.priceGoes === 'up') {
        this.updateLastPrices();
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
    decision.assetAmount = 0;
    this.console.log('checking price (%s) with last time price (%s) ...', this.askPrice, this.lastStepAskPrice);
    decision.priceGoes = this.checkStepPrice();
    if (decision.priceGoes === 'up' || decision.priceGoes === 'down') {
      if (!this.sellOnlyMode) {
        decision.side = 'buy';
        decision.assetAmount = this.getStepAssetAmount();
        this.console.log('making decision to buy %s asset', decision.assetAmount); 
      } else {
        if (decision.priceGoes === 'up' && this.sellOnlyMode && this.sellWholeBalance) {
          this.console.log('Price goes up, Sell only mode. sell whole balance..'.grey);
          let assetAmount = this.balanceManager.getAssetAmount();
          let assetAmountCurrency = assetAmount * this.bidPrice;
          if (assetAmountCurrency >= this.minimumCurrencyAmount) {
            decision.side = 'sell_whole_balance';
          }
        }
      }
      this.updateLastPrices();
    }
    return decision;
  }

  checkStepPrice() {
    let priceDiffPcnt = this.getPriceDiffPcnt(this.askPrice, this.lastStepAskPrice);
    if (this.logCheckPriceEnabled) {
      this.console.log('check ask price %s vs last %s', this.askPrice, this.lastStepAskPrice);
      this.console.log('ask price diff pcnt %s | stepUp = %s | stepDown = %s '.grey, priceDiffPcnt, this.priceStepUpPcnt, this.priceStepDownPcnt);
    }
    if (priceDiffPcnt < 0) {
      if (-priceDiffPcnt >= this.priceStepDownPcnt) {
        return 'down';
      }
    }
    //priceDiffPcnt = this.getPriceDiffPcnt(this.bidPrice, this.lastStepBidPrice);
    // if (this.logCheckPriceEnabled) {
    //   this.console.log('check ask price %s vs last %s', this.bidPrice, this.lastStepBidPrice);
    //   this.console.log('ask price diff pcnt %s | stepUp = %s | stepDown = %s '.grey, priceDiffPcnt, this.priceStepUpPcnt, this.priceStepDownPcnt);
    // }
    if (priceDiffPcnt > 0) {
      if (priceDiffPcnt >= this.priceStepUpPcnt) {
        return 'up';
      }
    }
    return false;
  }

  checkOrderPrice(orderPrice) {
    let priceDiffPcnt = this.getPriceDiffPcnt(this.bidPrice, orderPrice);
    if (this.logCheckPriceEnabled) {
      this.console.log('check ask price %s vs order last %s', this.bidPrice, orderPrice);
      this.console.log('ask price diff pcnt %s | stepUp = %s | stepDown = %s '.grey, priceDiffPcnt, this.priceStepUpPcnt, this.priceStepDownPcnt);
    }
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
    if (this.logAmountsEnabled) {
      this.console.log('stepCurrencyAmount: '.grey, this.stepCurrencyAmount);
    }
    return this.stepCurrencyAmount;
  }

  getStepAssetAmount() {
    let stepCurrencyAmount = this.getStepCurrencyAmount();
    let stepAssetAmount = 0
    if (this.askPrice > 0) {
      stepAssetAmount = stepCurrencyAmount / this.askPrice;
    }
    if (this.logAmountsEnabled) {
      this.console.log('stepAssetAmount: '.grey, stepAssetAmount);
    }
    return stepAssetAmount;
  }

  hasEnoughCurrencyToBuy(assetAmount) {
    let currencyBalanceAmount = this.balanceManager.getTradingCurrencyAmountAvailable();
    let totalPriceInCurrency = assetAmount * this.askPrice;
    if (this.logAmountsEnabled) {
      this.console.log('totalPriceInCurrency: %s, assetAmount: %s, currencyBalanceAmount: %s'.grey, totalPriceInCurrency, assetAmount, currencyBalanceAmount);
    }
    if (currencyBalanceAmount > totalPriceInCurrency) {
      return true;
    } else {
      return false;
    }
  }

  hasEnoughAssetToSell(assetAmount) {
    let assetBalanceAmount = this.balanceManager.getAssetAmount();
    if (this.logAmountsEnabled) {
      this.console.log('assetBalanceAmount: %s (%s$)'.grey, assetBalanceAmount, (assetBalanceAmount * this.bidPrice));
    }
    if (assetBalanceAmount >= assetAmount) {
      return true;
    } else {
      return false;
    }
  }

  getEnoughAssetAmountToSellWholeBalance() {
    let assetBalanceAmount = this.balanceManager.getAssetAmount();
    let assetBalanceAmountCurrency = assetBalanceAmount * this.bidPrice;
    if (this.logAmountsEnabled) {
      this.console.log('whole asset balance: %s (%s$)'.grey, assetBalanceAmount, assetBalanceAmountCurrency);  
    }
    if (assetBalanceAmountCurrency >= this.minimumCurrencyAmount) {
      return assetBalanceAmount;
    } else {
      return false;
    }
  }

  updateLastPrices() {
    if (this.logCheckPriceEnabled) {
      this.console.log('update last ask price %s to ask price %s'.grey, this.lastStepAskPrice, this.askPrice);
      this.console.log('update last bid price %s to bid price %s'.grey, this.lastStepBidPrice, this.bidPrice);
    }
    this.lastStepAskPrice = this.askPrice;
    this.lastStepBidPrice = this.bidPrice;
  }
}

module.exports = TraderLogic;