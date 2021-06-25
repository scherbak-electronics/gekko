const _ = require('lodash');
const util = require('../../core/util.js');
const logic = require('./logic');
const config = util.getConfig();
const dirs = util.dirs();
const OrderManager = require('../../exchange/orderManager');
const Exchange = require('../../exchange/exchange');
const moment = require('moment');
require(dirs.gekko + '/exchange/dependencyCheck');

const allowedPipelineControlActions = [
  'getTickerAction',
  'getBalancesAction',
  'saveInitialBalancesAction',
  'loadInitialBalancesAction',
  'sellAction',
  'buyAction',
  'testWithArgsAction'
];

const Trader = function(next) {
  _.bindAll(this);
  this.config = {};
  this.orderManager = {};
  this.config.exchange = config.watch.exchange;
  this.config.currency = config.watch.currency;
  this.config.asset = config.watch.asset;
  this.config.pipelineControlProcessPeriod = 2000;
  this.syncIntervalPeriod = 1000 * 60 * 10;
  this.logic = logic;
  this.propogatedTrades = 0;
  this.propogatedTriggers = 0;
  try {
    this.exchange = new Exchange(this.config)
    this.orderManager = new OrderManager(this.config, this.exchange);
  } catch(e) {
    util.die(e.message);
  }
  this.sync(() => {
    next();
  });
  this.syncInterval = setInterval(this.sync, this.syncIntervalPeriod);
  this.pipelineControlProcessInterval = setInterval(() => { 
    this.pipelineControlProcess(); 
  }, this.config.pipelineControlProcessPeriod);
}

Trader.prototype.setExchangeInitialBalances = function(balances) {
  this.exchangeInitialBalances = {
    balances: balances,
    time: moment.now(),
    readableTime: moment().format('YYYY-MM-DD HH:mm:ss')
  };
}

Trader.prototype.saveExchangeInitialBalances = function(balances) {
  let fileName = this.config.exchange + '-balance-initial.json';
  let result = util.saveJsonFile(fileName, util.dirs().pipelineControl, balances);
  return result;
}

Trader.prototype.loadExchangeInitialBalances = function() {
  let fileName = this.config.exchange + '-balance-initial.json';
  let result = util.loadJsonFile(fileName, util.dirs().pipelineControl);
  return result;
}

Trader.prototype.processCandle = function(candle, done) {
  //console.trace('Trader:  processCandle: candle.close: ', candle.close);
  let decision = this.logic.checkPriceAndMakeDecision(candle);
  if (decision == 'buy') {
    this.buy();
  } else if (decision == 'sell') {
    this.sell((err, result) => {
      if (result) {
        this.emit('orderCreated', result);
      } else {
        console.trace('Trader: sell error: ', err);
      }
    });
  } else if (decision == 'sell_and_buy') {
    this.sell((err, sellResult) => {
      if (sellResult) {
        this.emit('orderCreated', sellResult);
        this.buy((err, buyResult) => {
          if (buyResult) {
            this.emit('orderCreated', buyResult);
          } else {
            console.log('Trader: buy error: ', err);
          }
        });
      } else {
        console.log('Trader: sell error: ', err);
      }
    });
  }
  done();
}

Trader.prototype.buy = function(callback) {
  this.exchange.getBalances((err, balances) => {
    if (balances && !err) {
      let enough = this.logic.hasEnoughCurrency(balances);
      if (enough) {
        let amount = this.logic.getAmountOfAssetToBuy();
        let price = undefined;
        this.orderManager.createOrder('buy', amount, price, (err, result) => {
          if (result) {
            callback(undefined, result);
          } else {
            callback(err, undefined);
          }
        });
      }
    }
  });
}

Trader.prototype.sell = function(callback) {
  this.exchange.getBalances((err, balances) => {
    if (balances && !err) {
      let enough = this.logic.hasEnoughAsset(balances);
      if (enough) {
        let amount = this.logic.getAmountOfAssetToSell();
        let price = undefined;
        this.orderManager.createOrder('sell', amount, price, (err, result) => {
          if (result) {
            callback(undefined, result);
          } else {
            callback(err, undefined);
          }
        });
      }
    }
  });
}

Trader.prototype.createOrder = function(side, amount) {
  // for manual order creation
}

Trader.prototype.sync = function(next) {
  if (next) {
    next();
  }
}

Trader.prototype.updateAllFromExchange = function() {
  this.broker.updateLocalOrdersFromExchange();
}

Trader.prototype.pipelineControlProcess = function() {
  //console.log('pipelineControlProcessTimer this.config', this.config);
  let pipeCtrl = util.loadPipelineControlJsonFile(this.config);
  if (pipeCtrl) {
    if (pipeCtrl.trader) {
      if (pipeCtrl.trader.action.status === 'pending') {
        if (pipeCtrl.trader.action.name && this[pipeCtrl.trader.action.name]) {
          if (pipeCtrl.trader.action.args && pipeCtrl.trader.action.args.length > 0) {
            this[pipeCtrl.trader.action.name](...pipeCtrl.trader.action.args);
          } else {
            this[pipeCtrl.trader.action.name]();
          }
        }
        pipeCtrl.trader.action.status = 'done';
      }
    }
    let res = util.savePipelineControlJsonFile(pipeCtrl, this.config);
  } else {
    console.log('empty pipeline ctrl file...');
  }
}

Trader.prototype.getTickerAction = function() {
  this.exchange.getTicker((err, ticker) => {
    this.emit('getTickerAction', {err: err, ticker: ticker});
  });
}

Trader.prototype.getBalancesAction = function() {
  this.exchange.getBalances((err, balances) => {
    this.emit('getBalancesAction', {err: err, balances: balances});
  });
}

Trader.prototype.saveInitialBalancesAction = function() {
  this.exchange.getBalances((err, balances) => {
    if (balances && !err) {
      this.setExchangeInitialBalances(balances);
      this.saveExchangeInitialBalances(this.exchangeInitialBalances);
    } else {
      console.log('Save initial balances error: ', err);
    }
    this.emit('saveInitialBalancesAction', {err: err, balances: balances});
  });
}

Trader.prototype.loadInitialBalancesAction = function() {
  let balances  = this.loadExchangeInitialBalances();
  this.emit('loadInitialBalancesAction', {balances: balances});
}

Trader.prototype.sellAction = function(amount) {
  this.exchange.getBalances((err, balances) => {
    if (balances && !err) {
      let enough = this.logic.hasEnoughAsset(balances);
      if (enough) {
        let price = undefined;
        this.orderManager.createOrder('sell', amount, price, (err, result) => {
          this.emit('sellAction', {err: err, result: result});
        });
      }
    }
  });
}

Trader.prototype.buyAction = function(amount) {
  this.exchange.getBalances((err, balances) => {
    if (balances && !err) {
      let enough = this.logic.hasEnoughCurrency(balances);
      if (enough) {
        let price = undefined;
        this.orderManager.createOrder('buy', amount, price, (err, result) => {
          this.emit('buyAction', {err: err, result: result});
        });
      }
    }
  });
}

Trader.prototype.testWithArgsAction = function(text) {
  this.emit('testWithArgsAction', {text: text});
}

// teach our trader events
util.makeEventEmitter(Trader);
module.exports = Trader;
