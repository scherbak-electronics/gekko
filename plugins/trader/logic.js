/*
 *  SECO
 *  
 *  Trader logic
 * checking orders and market price
 * and make decision
 */
const _ = require('lodash');
var util = require('../../core/util');
//const config = util.getConfig();
const moment = require('moment');
var colors = require('colors');
const BalanceManager = require('./balanceManager');

var logic = {};
logic.init = function(config, exchange) {
  this.config = config;
  this.exchange = exchange;
  this.lastCheckPrice = undefined;
  this.balanceManager = new BalanceManager(this.config);
  this.priceStepPcnt = undefined;
  this.stepAmountPcnt = undefined;
  this.sellOnlyMode = undefined;
  this.tradingEnabled = undefined;
  this.realOrdersEnabled = undefined;
  this.buyAnyway = false;
  this.unableToSellOrdersCounterLimit = 10;
  this.price = undefined;
  this.createSettingsIfNotExist();
  this.loadSettings();
  this.loadLastCheckPrice();
}

/*
 * Returns one of possible decisions which are:
 * buy | sell | sell_and_buy 
 */
logic.checkPriceAndMakeDecision = function(candle, orders) {
  let res;
  let decision = {};
  decision.side = undefined;
  decision.orders = [];
  let unableToSellOrdersCounter = 0;
  this.price = candle.close;
  if (orders && orders.length) {
    console.log('Logic: %s orders found. Checking ORDERS prices...', orders.length);
    _.each(orders, (order) => {
      if (order.isEnabled === true) {
        console.log('Logic: Checking order price: | %s | %s | %s', order.amountAsset, order.price, moment(order.time).format('YYYY-MM-DD HH:mm'));
        res = this.checkStepPriceLevel(candle.close, order.price);
        if (res === 'up') {
          console.log('Logic: found order we can sell..'.bold.yellow);
          decision.orders.push(order);
        } else if (res === 'down') {
          unableToSellOrdersCounter++;
          console.log('Logic: Unable to sell this order, its price is high!'.red);
        }
      }
    });
    if (decision.orders.length > 0) {
      console.log('Logic: found %s orders for sale..'.bold.yellow, decision.orders.length);
      if (this.isSellOnlyMode()) {
        decision.side = 'sell';
      } else {
        decision.side = 'sell_and_buy';
      }
      this.saveLastCheckPrice(candle.close);
      return decision;
    } 
  } 
  let lastPrice = this.getLastCheckPrice();
  console.log('Logic: checking price (%s) with last time price (%s) ...', candle.close, lastPrice);
  res = this.checkStepPriceLevel(candle.close, lastPrice);
  if (res === 'up' || res === 'down') {
    if (this.isSellOnlyMode()) {
      // doing nothing...
      console.log('Logic: Sell only mode. doing nothing here...');
    } else {
      if (this.buyAnyway) {
        console.log('Logic: making decision to buy anyway!'.bold.green);
        decision.side = 'buy';
      } else {
        if (unableToSellOrdersCounter < this.unableToSellOrdersCounterLimit) {
          console.log('Logic: making decision to buy! '.bold.green + 'NOTE: found %s opened orders.'.yellow, unableToSellOrdersCounter);
          decision.side = 'buy';
        } else {
          console.log('Logic: Unable to make buy decision. Found %s opened orders.'.red, unableToSellOrdersCounter);
        }
      }
    }
    this.saveLastCheckPrice(candle.close);
  }
  return  decision;
}

logic.checkStepPriceLevel = function(price, lastCheckPrice) {
  let priceDiffPcnt = this.getPriceDiffPcnt(price, lastCheckPrice); 
  if (priceDiffPcnt > 0) {
    if (priceDiffPcnt >= this.priceStepPcnt) {
      console.log('Logic: price change '.bold + 'up +%s%'.green, priceDiffPcnt);
      return 'up';
    }
  } else if (priceDiffPcnt < 0) {
    if (-priceDiffPcnt >= this.priceStepPcnt) {
      console.log('Logic: price change '.bold + 'down %s%'.red, priceDiffPcnt);
      return 'down';
    }
  }
  console.log('Logic: only %s% price change', Number(priceDiffPcnt).toFixed(2));
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
  console.log('Logic: stepCurrencyAmount: ', stepCurrencyAmount);
  return stepCurrencyAmount;
}

logic.getStepAssetAmount = function(balances) {
  let stepCurrencyAmount = this.getStepCurrencyAmount(balances);
  let stepAssetAmount = stepCurrencyAmount / this.price;
  console.log('Logic: stepAssetAmount: ', stepAssetAmount);
  return stepAssetAmount;
}

logic.hasEnoughCurrency = function(balances, assetAmount) {
  let currencyBalanceAmount = this.getCurrencyBalanceAmount(balances);
  let totalPriceInCurrency = assetAmount * this.price;
  console.log('Logic: totalPriceInCurrency: ', totalPriceInCurrency);
  if (currencyBalanceAmount > totalPriceInCurrency) {
    return true;
  } else {
    return false;
  }
}

logic.hasEnoughAsset = function(balances, assetAmount) {
  let assetBalanceAmount = this.getAssetBalanceAmount(balances);
  console.log('Logic: assetBalanceAmount: ', assetBalanceAmount);
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
  console.log('Logic: last time price %s saved.', lastPrice.lastCheckPrice);
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

logic.isSellOnlyMode = function() {
  this.loadSettings();
  return this.sellOnlyMode;
}

logic.isTradingEnabled = function() {
  this.loadSettings();
  return this.tradingEnabled;
}

logic.isRealOrdersEnabled = function() {
  this.loadSettings();
  return this.realOrdersEnabled;
}

logic.setSellOnlyMode = function(value) {
  this.sellOnlyMode = value;
  this.saveSettings();
}

logic.setTradingEnabled = function(value) {
  this.tradingEnabled = value;
  this.saveSettings();
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

logic.createSettingsIfNotExist = function() {
  let fileName = util.getMarketPairId(this.config) + '-logic-settings.json';
  let result = util.loadJsonFile(fileName, util.dirs().pipelineControl);
  if (!result  || (result && result.err)) {
    this.sellOnlyMode = false;
    this.tradingEnabled = false;
    this.realOrdersEnabled = false;
    this.exchange.api.isSimulation = true;
    let fileNameSave = util.getMarketPairId(this.config) + '-logic-settings.json';
    return util.saveJsonFile(fileNameSave, util.dirs().pipelineControl, {
      sellOnlyMode: this.sellOnlyMode,
      tradingEnabled: this.tradingEnabled,
      realOrdersEnabled: this.realOrdersEnabled
    });
  } 
}

module.exports = logic;