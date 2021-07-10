/*
 *  SECO
 *  
 *  Trader logic
 * checking orders and market price
 * and make decision
 */
const _ = require('lodash');
var util = require('../../core/util');
var colors = require('colors');

class BalanceManager {
  config;
  lastChangeUpBalances;
  constructor(config) {
    this.config = config;
    this.lastChangeUpBalances = undefined;
    let balances = this.loadLastChangeUpBalances();
    if (balances) {
      this.lastChangeUpBalances = balances;
      console.log('Balance Manager: Last change up balances loaded.');
    } else {
      this.saveNewLastChangeUpBalances();
      console.log('Balance Manager: New empty last change up balances saved.');
    }
  }

  getLastChangeUpBalances() {
    let balances = this.loadLastChangeUpBalances();
    if (balances) {
      this.lastChangeUpBalances = balances;
      return this.lastChangeUpBalances;
    } else {
      return false;
    }
  }

  checkLastChangeUpBalances(balances) {
    console.log('Balance Manager: checking last balance...');
    if (this.lastChangeUpBalances && this.lastChangeUpBalances.length) {
      let isChangeUp = false;
      _.each(this.lastChangeUpBalances, (lastBalance) => {
        if (lastBalance.name === this.config.currency) {
          _.each(balances, (balance) => {
            if (balance.name === this.config.currency) {
              if (lastBalance.amount < balance.amount) {
                console.log('Balance Manager: balance changed up to %s comparing to last %s amount.'.green, balance.amount, lastBalance.amount);
                isChangeUp = true;
              }
              return false;
            }
          });
          return false;
        }
      });
      return isChangeUp;
    }
    return false;
  }

  updateLastChangeUpBalances(balances) {
    this.lastChangeUpBalances = balances;
    console.log('Balance Manager: last balance updated.');
    return this.saveLastChangeUpBalances(this.lastChangeUpBalances);
  }

  saveNewLastChangeUpBalances() {
    let balances = [];
    balances.push({
      name: this.config.currency,
      amount: 0
    });
    balances.push({
      name: this.config.asset,
      amount: 0
    });
    this.lastChangeUpBalances = balances;
    let fileName = util.getMarketPairId(this.config) + '-balances.json';
    return util.saveJsonFile(fileName, util.dirs().spotOrders, balances);
  }

  saveLastChangeUpBalances(balances) {
    let fileName = util.getMarketPairId(this.config) + '-balances.json';
    return util.saveJsonFile(fileName, util.dirs().spotOrders, balances);
  }

  loadLastChangeUpBalances() {
    let fileName = util.getMarketPairId(this.config) + '-balances.json';
    let result = util.loadJsonFile(fileName, util.dirs().spotOrders);
    if (result && result.length) {
      return result;
    } else {
      return false;
    }
  }
  
}

module.exports = BalanceManager;