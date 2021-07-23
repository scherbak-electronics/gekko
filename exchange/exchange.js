const LogProxyClass = require('../core/log-proxy');
const _ = require('lodash');
const exchangeUtils = require('./exchangeUtils');
const bindAll = exchangeUtils.bindAll;
const moment = require('moment');

class Exchange {
  api;
  config;
  capabilities;
  marketConfig;
  interval;
  roundPrice;
  roundAmount;
  outbidPrice;
  market;
  fee;
  balances;
  constructor(config) {
    this.console = new LogProxyClass(config, 'Exchange');
    this.console.log('init...'); 
    this.config = config;
    const slug = config.exchange.toLowerCase();
    const API = require('./wrappers/' + slug);
    this.api = new API(config);
    this.capabilities = API.getCapabilities();
    this.marketConfig = _.find(this.capabilities.markets, (p) => {
      return _.first(p.pair) === config.currency.toUpperCase() &&
        _.last(p.pair) === config.asset.toUpperCase();
    });
    if(config.customInterval) {
      this.interval = config.customInterval;
      this.api.interval = config.customInterval;
      this.console.log(new Date, '[GB] setting custom interval to', config.customInterval);
    } else {
      this.interval = this.api.interval || 1500;
    }
    this.roundPrice = this.api.roundPrice.bind(this.api);
    this.roundAmount = this.api.roundAmount.bind(this.api);
    if(_.isFunction(this.api.outbidPrice)) {
      this.outbidPrice = this.api.outbidPrice.bind(this.api);
    }
    this.market = config.currency.toUpperCase() + config.asset.toUpperCase();
    bindAll(this);
  }

  getBalance(fund) {
    return this.getFund(fund).amount;
  }
  
  getFund(fund) {
    return _.find(this.balances, function(f) { return f.name === fund});
  }

  getBalances(callback) {
    this.api.getPortfolio([{currency: 'UAH'}], (err, portfolio) => {
      if (portfolio) {
        // only include the currency/asset of this market
        const balances = [this.config.currency, this.config.asset].map((name) => {
          let item = _.find(portfolio, {name});
          if (!item) {
            // assume we have 0
            item = { name, amount: 0 };
          }
          return item;
        });
        this.balances = balances;
        callback(undefined, this.balances);
      } else {
        callback(err, undefined);
      }
    });
  }

  getFee(callback) {
    this.api.getFee((err, fee) => {
      if (fee) {
        this.fee = fee;
      }
      callback(err, fee);
    });
  }

  getTicker(callback) {
    this.api.getTicker(callback);
  }
}

module.exports = Exchange;