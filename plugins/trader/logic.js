/**
 * HBSW
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

const logicSettings = {
  priceStepPcnt: 0,
  stepAmountPcnt: 0,
  buyOnlyIfGoesDownMode: false,
  sellOnlyMode: false
};

const logicState = {
  lastCheckPrice: undefined,
  price: undefined,
  tradingEnabled: undefined,
  realOrdersEnabled: undefined
};

var logic = {};
logic.init = function(config, exchange) {
  this.config = config;
  this.exchange = exchange;
  this.console = new LogProxyClass(config, 'Trader Logic');
  this.balanceManager = new BalanceManager(this.config);
  
  this.lastCheckPrice = undefined;
  this.price = undefined;
  this.tradingEnabled = undefined;
  this.realOrdersEnabled = undefined;

  this.priceStepPcnt = undefined;
  this.stepAmountPcnt = undefined;
  this.buyOnlyIfGoesDownMode = false;
  this.sellOnlyMode = undefined;
  
  this.createSettingsIfNotExist();
  this.loadSettings();
  this.loadLastCheckPrice();
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
logic.checkOrdersPriceAndMakeDecision = function(candle, orders) {
  let res;
  let decision = {};
  decision.side = undefined;
  decision.orders = [];
  this.price = candle.close;
  _.each(orders, (order) => {
    if (order.isEnabled === true) {
      //this.console.log('Checking order price: | %s | %s | %s', order.amountAsset, order.price, moment(order.time).format('YYYY-MM-DD HH:mm'));
      res = this.checkStepPriceLevel(candle.close, order.price);
      if (res === 'up') {
        //this.console.log('found order we can sell..'.bold.yellow);
        decision.orders.push(order);
      } else if (res === 'down') {
        //this.console.log('Unable to sell this order, its price is too high!'.red);
      }
    }
  });
  if (decision.orders.length > 0) {
    this.console.log('found %s orders for sale..'.bold.yellow, decision.orders.length);
    if (this.getSellOnlyMode() || this.getBuyOnlyIfGoesDownMode()) {
      decision.side = 'sell';
    } else {
      decision.side = 'sell_and_buy';
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
logic.checkPriceAndMakeDecision = function(candle) {
  let decision = {};
  decision.side = undefined;
  decision.orders = [];
  this.price = candle.close;
  let lastPrice = this.getLastCheckPrice();
  this.console.log('checking price (%s) with last time price (%s) ...', candle.close, lastPrice);
  decision.priceStepChangeDir = this.checkStepPriceLevel(candle.close, lastPrice);
  if (decision.priceStepChangeDir === 'up' || decision.priceStepChangeDir === 'down') {
    if (this.getSellOnlyMode()) {
      // doing nothing...
      this.console.log('Sell only mode. doing nothing here...');
    } else {
      if (this.getBuyOnlyIfGoesDownMode()) {
        this.console.log('Buy only if goes down mode.');
        if (decision.priceStepChangeDir === 'down') {
          this.console.log('making decision to buy if goes down!'.bold.green);
          decision.side = 'buy';
        }
      } else {
        this.console.log('making decision to buy! '.bold.green);
        decision.side = 'buy';
      }
    }
    this.saveLastCheckPrice(candle.close);
  }
  return decision;
}

logic.checkStepPriceLevel = function(price, lastCheckPrice) {
  let priceDiffPcnt = this.getPriceDiffPcnt(price, lastCheckPrice); 
  if (priceDiffPcnt > 0) {
    if (priceDiffPcnt >= this.priceStepPcnt) {
      //this.console.log('price change '.bold + 'up +%s%'.green, priceDiffPcnt);
      return 'up';
    }
  } else if (priceDiffPcnt < 0) {
    if (-priceDiffPcnt >= this.priceStepPcnt) {
      //this.console.log('price change '.bold + 'down %s%'.red, priceDiffPcnt);
      return 'down';
    }
  }
  //this.console.log('only %s% price change', Number(priceDiffPcnt).toFixed(2));
  return false;
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

logic.getPcntOfAmount = function(amount, pcntOfAmount) {
  let resultAmount = (amount / 100) * pcntOfAmount;
  return resultAmount;
}

logic.getCurrencyBalanceAmount = function(balances) {
  let currencyBalance = _.find(balances, (balance) => {
    if (balance.name === this.config.currency) {
      return true;
    }
  });
  return currencyBalance.amount;
}

logic.getAssetBalanceAmount = function(balances) {
  let assetBalance = _.find(balances, (balance) => {
    if (balance.name === this.config.asset) {
      return true;
    }
  });
  return assetBalance.amount;
}

logic.getStepCurrencyAmount = function(balances) {
  let isChangeUp = this.balanceManager.checkLastChangeUpBalances(balances);
  if (isChangeUp) {
    resultBalances = balances;
  } else {
    resultBalances = this.balanceManager.getLastChangeUpBalances();
  }
  let currencyBalance = _.find(resultBalances, (balance) => {
    if (balance.name === this.config.currency) {
      return true;
    }
  });
  let stepCurrencyAmount = (currencyBalance.amount / 100) * this.stepAmountPcnt;
  this.console.log('stepCurrencyAmount: ', stepCurrencyAmount);
  return stepCurrencyAmount;
}

logic.getStepAssetAmount = function(balances) {
  let stepCurrencyAmount = this.getStepCurrencyAmount(balances);
  let stepAssetAmount = stepCurrencyAmount / this.price;
  this.console.log('stepAssetAmount: ', stepAssetAmount);
  return stepAssetAmount;
}

logic.hasEnoughCurrency = function(balances, assetAmount) {
  let currencyBalanceAmount = this.getCurrencyBalanceAmount(balances);
  let totalPriceInCurrency = assetAmount * this.price;
  this.console.log('totalPriceInCurrency: ', totalPriceInCurrency);
  if (currencyBalanceAmount > totalPriceInCurrency) {
    return true;
  } else {
    return false;
  }
}

logic.hasEnoughAsset = function(balances, assetAmount) {
  let assetBalanceAmount = this.getAssetBalanceAmount(balances);
  this.console.log('assetBalanceAmount: ', assetBalanceAmount);
  if (assetBalanceAmount >= assetAmount) {
    return true;
  } else {
    return false;
  }
}

logic.saveLastCheckPrice = function(price) {
  let lastPrice = {
    lastCheckPrice: price,
    lastTimeReadable: moment().format('YYYY-MM-DD HH:mm')
  };
  let fileName = util.getMarketPairId(this.config) + '-logic-last-price.json';
  let result = util.saveJsonFile(fileName, util.dirs().pipelineControl, lastPrice);
  this.console.log('last time price %s saved.', lastPrice.lastCheckPrice);
  return result;
}

logic.loadLastCheckPrice = function() {
  let fileName = util.getMarketPairId(this.config) + '-logic-last-price.json';
  let result = util.loadJsonFile(fileName, util.dirs().pipelineControl);
  if (result && !result.err) {
    if (result.lastCheckPrice && result.lastCheckPrice > 0) {
      this.lastCheckPrice = result.lastCheckPrice;
      return true;
    } 
  }
  return false;
}

logic.getLastCheckPrice = function() {
  this.loadLastCheckPrice();
  return this.lastCheckPrice;
}

logic.saveSettings = function() {
  let fileName = util.getMarketPairId(this.config) + '-logic-settings.json';
  let settings = util.loadJsonFile(fileName, util.dirs().pipelineControl);
  if (settings && !settings.err) {
    if (this.buyOnlyIfGoesDownMode !== settings.buyOnlyIfGoesDownMode) {
      settings.buyOnlyIfGoesDownMode = this.buyOnlyIfGoesDownMode;
    }
    if (this.sellOnlyMode !== settings.sellOnlyMode) {
      settings.sellOnlyMode = this.sellOnlyMode;
    }
    if (this.tradingEnabled !== settings.tradingEnabled) {
      settings.tradingEnabled = this.tradingEnabled;
    }
    if (this.realOrdersEnabled !== settings.realOrdersEnabled) {
      settings.realOrdersEnabled = this.realOrdersEnabled;
    }
  }
  let fileNameSave = util.getMarketPairId(this.config) + '-logic-settings.json';
  return util.saveJsonFile(fileNameSave, util.dirs().pipelineControl, settings);
}

logic.loadSettings = function() {
  let fileName = util.getMarketPairId(this.config) + '-logic-settings.json';
  let result = util.loadJsonFile(fileName, util.dirs().pipelineControl);
  if (result && !result.err) {
    this.buyOnlyIfGoesDownMode = result.buyOnlyIfGoesDownMode;
    this.sellOnlyMode = result.sellOnlyMode;
    this.tradingEnabled = result.tradingEnabled;
    this.realOrdersEnabled = result.realOrdersEnabled;
    if (this.realOrdersEnabled) {
      this.exchange.api.isSimulation = false;
    } else {
      this.exchange.api.isSimulation = true;
    }
    return true;
  }
  return false;
}

logic.createSettingsIfNotExist = function() {
  let fileName = util.getMarketPairId(this.config) + '-logic-settings.json';
  let result = util.loadJsonFile(fileName, util.dirs().pipelineControl);
  if (!result  || (result && result.err)) {
    this.buyOnlyIfGoesDownMode = false;
    this.sellOnlyMode = false;
    this.tradingEnabled = false;
    this.realOrdersEnabled = false;
    this.exchange.api.isSimulation = true;
    let fileNameSave = util.getMarketPairId(this.config) + '-logic-settings.json';
    return util.saveJsonFile(fileNameSave, util.dirs().pipelineControl, {
      buyOnlyIfGoesDownMode: this.buyOnlyIfGoesDownMode,
      sellOnlyMode: this.sellOnlyMode,
      tradingEnabled: this.tradingEnabled,
      realOrdersEnabled: this.realOrdersEnabled
    });
  } 
}

logic.getBuyOnlyIfGoesDownMode = function() {
  this.loadSettings();
  return this.buyOnlyIfGoesDownMode;
}

logic.setBuyOnlyIfGoesDownMode = function(value) {
  this.buyOnlyIfGoesDownMode = value;
  this.saveSettings();
}

logic.getSellOnlyMode = function() {
  this.loadSettings();
  return this.sellOnlyMode;
}

logic.setSellOnlyMode = function(value) {
  this.sellOnlyMode = value;
  this.saveSettings();
}

logic.isTradingEnabled = function() {
  this.loadSettings();
  return this.tradingEnabled;
}

logic.setTradingEnabled = function(value) {
  this.tradingEnabled = value;
  this.saveSettings();
}

logic.isRealOrdersEnabled = function() {
  this.loadSettings();
  return this.realOrdersEnabled;
}

logic.setRealOrdersEnabled = function(value) {
  this.realOrdersEnabled = value;
  if (this.realOrdersEnabled) {
    this.exchange.api.isSimulation = false;
  } else {
    this.exchange.api.isSimulation = true;
  }
  this.saveSettings();
}

module.exports = logic;