/*
 *  SECO
 *  
 * Trader Balance Manager
 * checking orders and market price
 * and make decision
 */
const LogProxyClass = require('../../core/log-proxy');
const BaseModule = require('../../core/seco/base-module');
const _ = require('lodash');
var util = require('../../core/util');
var colors = require('colors');
var fs = require('fs');

class BalanceManager extends BaseModule {
  constructor(config) {
    super(config);
    this.console = new LogProxyClass(config, 'Balance Manager');
    this.files = [
      {
        name: 'balances.json',
        path: this.pairPath,
        createIfNotExist: true,
        propNames: [
          'currencyBalance',
          'assetBalance',
          'currencyBalanceHistory',
          'currencyBalanceHistoryIndex',
          'currencyBalanceHistorySize',
          'ordersTotalCurrencyProfit',
          'tradingAvailableCurrencyBalancePcnt',
          'tradingAvailableCurrencyProfitPcnt',
        ]
      }
    ];
    this.currencyBalance = {
      name: this.config.currency,
      amount: 0
    };
    this.assetBalance = {
      name: this.config.asset,
      amount: 0
    };
    this.currencyBalanceHistory = [
      {
        amount: 0
      }
    ];
    this.currencyBalanceHistoryIndex = 0;
    this.currencyBalanceHistorySize = 10;
    this.ordersTotalCurrencyProfit = 0;
    this.tradingAvailableCurrencyBalancePcnt = 10;
    this.tradingAvailableCurrencyProfitPcnt = 0;
    this.createNewFilesIfNotExist();
    this.readData();
  }

  getTradingAvailableCurrencyAmount() {
    let currencyAmount = this.getCurrencyAmount();
    return (currencyAmount / 100) * this.tradingAvailableCurrencyBalancePcnt;
  }

  getAssetAmount() {
    return this.assetBalance.amount;
  }

  getCurrencyAmount() {
    return this.currencyBalance.amount;
  }

  writeCurrencyAmount(amount) {
    this.currencyBalance.amount = amount;
    this.writeData();
  }
  
  updateLastCurrencyAmount(amount) {
    if (this.currencyBalanceHistoryIndex < (this.currencyBalanceHistorySize - 1)) {
      this.currencyBalanceHistoryIndex++
    } else {
      this.currencyBalanceHistoryIndex = 0;
    }
    this.currencyBalanceHistory[this.currencyBalanceHistoryIndex] = { amount: amount };
  }

  readLastCurrencyAmount() {
    this.readData();
    return this.currencyBalanceHistory[this.currencyBalanceHistoryIndex].amount;
  }

  writeBalances(balances) {
    this.readLastCurrencyAmount();
    _.each(balances, (balance) => {
      if (balance.name === this.config.asset) {
        this.assetBalance = balance;
      }
      if (balance.name === this.config.currency) {
        this.currencyBalance = balance;
        if (this.currencyBalance.amount !== this.currencyBalanceHistory[this.currencyBalanceHistoryIndex].amount) {
          this.updateLastCurrencyAmount(this.currencyBalance.amount);
        }
      }
    });
    return this.writeData();
  }
}

module.exports = BalanceManager;