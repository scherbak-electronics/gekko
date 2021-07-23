/*
 *  SECO
 *  
 *  Trader logic
 * checking orders and market price
 * and make decision
 */
const LogProxyClass = require('../../core/log-proxy');
const _ = require('lodash');
var util = require('../../core/util');
var colors = require('colors');
var path = require('path');
var fs = require('fs');

class BalanceManager {
  config;
  lastChangeUpBalances;
  constructor(config) {
    this.console = new LogProxyClass(config, 'Balance Manager')
    this.config = config;
    this.stateFileName = this.config.exchange + '-last-change-balances.json';
    this.stateFilePath = util.dirs().pipelineControl;
    this.stateFileFullPathOld = util.dirs().spotOrders + util.getMarketPairId(this.config) + '-balances.json';
    this.lastChangeUpBalances = undefined;

    let balances = this.loadLastChangeUpBalances();
    if (balances) {
      this.lastChangeUpBalances = balances;
      this.console.log('Last change up balances loaded.');
    } else {
      let oldStateData = this.stateFileLoadOldIfExist();
      if (oldStateData && !oldStateData.err) {
        if (this.stateFileCreateNewIfNotExist(oldStateData)) {
          this.console.log('New state file created from old file data.');  
        }
      } else {
        this.saveNewLastChangeUpBalances();
        this.console.log('New empty last change up balances saved.');
      }
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

  getLastChangedUpCurrencyBalance() {
    let balances = this.loadLastChangeUpBalances();
    if (balances) {
      let lastChangedUpCurrencyBalance = _.find(balances, (balance) => {
        if (balance.name === this.config.currency) {
          return true;
        }
      });
      if (lastChangedUpCurrencyBalance) {
        return lastChangedUpCurrencyBalance;
      }
    } 
    return false;
  }

  checkLastChangeUpBalances(balances) {
    this.console.log('checking last balance...');
    if (this.lastChangeUpBalances && this.lastChangeUpBalances.length) {
      let isChangeUp = false;
      _.each(this.lastChangeUpBalances, (lastBalance) => {
        if (lastBalance.name === this.config.currency) {
          _.each(balances, (balance) => {
            if (balance.name === this.config.currency) {
              if (lastBalance.amount < balance.amount) {
                this.console.log('balance changed up to %s comparing to last %s amount.'.green, balance.amount, lastBalance.amount);
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
    this.console.log('last balance updated.');
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
    return util.saveJsonFile(this.stateFileName, this.stateFilePath, balances);
  }

  saveLastChangeUpBalances(balances) {
    return util.saveJsonFile(this.stateFileName, this.stateFilePath, balances);
  }

  loadLastChangeUpBalances() {
    let result = util.loadJsonFile(this.stateFileName, this.stateFilePath);
    if (result && result.length) {
      return result;
    } else {
      return false;
    }
  }
  
  stateFileCreateNewIfNotExist(newData) {
    let fullPath = this.stateFilePath + this.stateFileName;
    let data = false;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (e) {
      data = {err: e};
    }
    if ((data && data.err) || !data) {
      data = false;
      try {
        fs.writeFileSync(fullPath, JSON.stringify(newData, 0, 2));
        return true;
      } catch (e) {
        data = {err: e};
      }
    } 
    return data;
  }

  stateFileLoadOldIfExist() {
    let data = false;
    try {
      data = JSON.parse(fs.readFileSync(this.stateFileFullPathOld, 'utf8'));
    } catch (e) {
      data = {err: e};
    }
    return data;
  }
}

module.exports = BalanceManager;