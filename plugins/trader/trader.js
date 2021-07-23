const LogProxyClass = require('../../core/log-proxy');
const _ = require('lodash');
const util = require('../../core/util.js');
const logic = require('./logic');
const config = util.getConfig();
const dirs = util.dirs();
const OrderManager = require('../../exchange/order-manager');
const Exchange = require('../../exchange/exchange');
const moment = require('moment');
var colors = require('colors');
require(dirs.gekko + '/exchange/dependencyCheck');

const allowedPipelineControlActions = [
  'getTickerAction',
  'getBalancesAction',
  'saveInitialBalancesAction',
  'loadInitialBalancesAction',
  'sellAction',
  'buyAction',
  'testWithArgsAction',
  'getOrdersAction',
  'saveSettingsAction',
  'sellOrderByIdAction',
  'realOrdersAction', // realOrdersEnabled
  'tradingAction', // tradingEnabled
  'loadSettingsAction',
  'enableOrderAction',
  'disableOrderAction',
  'buyOnlyIfGoesDownAction',
  'sellOnlyModeAction'
];

const Trader = function(next) {
  _.bindAll(this);
  this.config = {};
  this.config.key = config.trader.key;
  this.config.secret = config.trader.secret;
  this.config.exchange = config.watch.exchange;
  this.config.currency = config.watch.currency;
  this.config.asset = config.watch.asset;
  this.config.pipelineControlProcessPeriod = 999;
  this.console = new LogProxyClass(this.config, 'Trader');
  this.console.log('init...');
  this.syncIntervalPeriod = 35000;
  this.propogatedTrades = 0;
  this.propogatedTriggers = 0;
  this.logic = logic;
  try {
    this.exchange = new Exchange(this.config)
    this.orderManager = new OrderManager(this.config, this.exchange);
    this.logic.init(this.config, this.exchange);
    this.logic.setTradingEnabled(false);
    this.logic.setRealOrdersEnabled(false);
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
  
  this.loadSettingsAction();
  this.getTickerAction();
  this.getBalancesAction();
  this.getOrdersAction();
  this.loadInitialBalancesAction();
}

Trader.prototype.sync = function(next) {
  this.exchange.getTicker((err, ticker) => {
    if (ticker) {
      this.logic.price = ticker.ask;
      this.emit('getTickerAction', ticker);
      this.console.log('%s %s \ %s sync.', this.config.asset, ticker.ask, ticker.bid);
    } else {
      this.emit('traderError', 'Get ticker fail: ' + err);
    }
  });
  if (next) {
    next();
  }
}

Trader.prototype.processCandle = function(candle, done) {
  this.logic.price = candle.close;
  if (this.logic.lastCheckPrice === undefined) {
    this.console.log('initialize and save last check price...');
    this.logic.saveLastCheckPrice(candle.close);
  }
  if (this.logic.isTradingEnabled()) {
    this.console.log('trading active: (candle price: %s)', candle.close);
    let orders = this.orderManager.getOpenedMarketTypeOrders();
    let ordersDecision = this.logic.checkOrdersPriceAndMakeDecision(candle, orders);
    if (ordersDecision.side == 'sell') {
      this.console.log('Found %s order for sale. Sell it.', ordersDecision.orders.length);
      if (ordersDecision.orders.length == 1) {
        _.each(ordersDecision.orders, (order) => {
          this.sell(order, (sellErr, result) => {
            if (result && result.orderId) {
              this.orderManager.updateOrdersFromExchange((sellSyncErr, updatedOrders) => {
                if (updatedOrders && updatedOrders.length) {
                  let eventData = { sellOrderId: result.orderId };
                  this.emit('sell', eventData);
                  this.emitOrders(updatedOrders);
                  this.getBalancesAction();
                } else {
                  this.console.log('Process candle fail (sell sync): ', sellSyncErr);
                  this.emit('traderError', 'Process candle fail (sell sync): ' + sellSyncErr);
                }
              });
            } else {
              this.console.log('Process candle fail (sell): ', sellErr);
              this.emit('traderError', 'Process candle fail (sell): ' + sellErr);
            }
          });
          return false;
        });
      } else if (ordersDecision.orders.length > 1) {
        this.console.log('Found %s orders for sale. Sell as one big order (TODO)', ordersDecision.orders.length);
        // TODO: implement sell multiple orders as one single order
        // this.sellMultiple(ordersDecision.orders, (sellErr, result) => {
        // });
        _.each(ordersDecision.orders, (order) => {
          this.sell(order, (sellErr, result) => {
            if (result && result.orderId) {
              this.orderManager.updateOrdersFromExchange((sellUpdErr, updatedOrders) => {
                if (updatedOrders && updatedOrders.length) {
                  let eventData = { sellOrderId: result.orderId };
                  this.emit('sellMultiple', eventData);
                  this.emitOrders(updatedOrders);
                  this.getBalancesAction();
                } else {
                  this.console.log('Process candle fail (sellMultiple sync): ', sellUpdErr);
                  this.emit('traderError', 'Process candle fail (sellMultiple sync): ' + sellUpdErr);
                }
              });
            } else {
              this.console.log('Process candle fail (sellMultiple): ', sellErr);
              this.emit('traderError', 'Process candle fail (sellMultiple): ' + sellErr);
            }
          });
          return false;
        });
      }
    } else if (ordersDecision.side == 'sell_and_buy') {
      if (ordersDecision.orders.length == 1) {
        this.console.log('Found %s order for sale. Sell and buy new.', ordersDecision.orders.length);
        _.each(ordersDecision.orders, (order) => {
          this.sell(order, (sellErr, result) => {
            if (result && result.orderId) {
              this.buy((buyErr, buyRes) => {
                if (buyRes && buyRes.orderId) {
                  this.orderManager.updateOrdersFromExchange((buySyncErr, updatedOrders) => {
                    if (updatedOrders && updatedOrders.length) {
                      let eventData = { 
                        sellOrderId: result.orderId, 
                        buyOrderId: buyRes.orderId
                      };
                      this.emit('sellAndBuy', eventData);
                      this.emitOrders(updatedOrders);
                      this.getBalancesAction();
                    } else {
                      this.console.log('Process candle fail (sell_and_buy sync): ', buySyncErr);
                      this.emit('traderError', 'Process candle fail (sell_and_buy sync): ' + buySyncErr);
                    }
                  });
                } else {
                  this.console.log('Process candle fail (sell_and_buy buy): ' + buyErr);
                  this.emit('traderError', 'Process candle fail (sell_and_buy buy): ' + buyErr);
                }
              });
            } else {
              this.console.log('Process candle fail (sell_and_buy sell): ', sellErr);
              this.emit('traderError', 'Process candle fail (sell_and_buy sell): ' + sellErr);
            }
          });
          return false;
        });
      } else if (ordersDecision.orders.length > 1) {
        this.console.log('Found %s orders for sale. Sell as one big order (TODO)', ordersDecision.orders.length);
        // TODO: implement sell multiple orders as one single order
        // this.sellMultiple(ordersDecision.orders, (sellErr, result) => {
        // });
        _.each(ordersDecision.orders, (order) => {
          this.sell(order, (sellErr, result) => {
            if (result && result.orderId) {
              this.buy((buyErr, buyRes) => {
                if (buyRes && buyRes.orderId) {
                  this.orderManager.updateOrdersFromExchange((buyUpdErr, updatedOrders) => {
                    if (updatedOrders && updatedOrders.length) {
                      let eventData = { 
                        sellOrderId: result.orderId, 
                        buyOrderId: buyRes.orderId
                      };
                      this.emit('sellMultipleAndBuy', eventData);
                      this.emitOrders(updatedOrders);
                      this.getBalancesAction();
                    } else {
                      this.console.log('Process candle fail (sellMultipleAndBuy sync): ', buyUpdErr);
                      this.emit('traderError', 'Process candle fail (sellMultipleAndBuy sync): ' + buyUpdErr);
                    }
                  });
                } else {
                  this.console.log('Process candle fail (sellMultipleAndBuy buy): ' + buyErr);
                  this.emit('traderError', 'Process candle fail (sellMultipleAndBuy buy): ' + buyErr);
                }
              });
            } else {
              this.console.log('Process candle fail (sellMultipleAndBuy sell): ', sellErr);
              this.emit('traderError', 'Process candle fail (sellMultipleAndBuy sell): ' + sellErr);
            }
          });
          return false;
        });
      }
    }
    let oneStepDecision = this.logic.checkPriceAndMakeDecision(candle);
    if (oneStepDecision.side == 'buy') {
      this.console.log('Buy one step order.');
      this.buy((buyErr, buyRes) => {
        if (buyRes && buyRes.orderId) {
          this.orderManager.updateOrdersFromExchange((buyUpdErr, updatedOrders) => {
            if (updatedOrders && updatedOrders.length) {
              let eventData = { buyOrderId: buyRes.orderId };
              this.emit('buy', eventData);
              this.emitOrders(updatedOrders);
              this.getBalancesAction();
            } else {
              this.console.log('Process candle fail (buy sync): ', buyUpdErr);
              this.emit('traderError', 'Process candle fail (buy sync): ' + buyUpdErr);
            }
          });
        } else {
          this.console.log('Process candle fail (buy): ' + buyErr);
          this.emit('traderError', 'Process candle fail (buy): ' + buyErr);
        }
      });
    } else if (oneStepDecision.priceStepChangeDir) {
      this.console.log('Price changed one step %s.', oneStepDecision.priceStepChangeDir);
    }
    let lastTimeCheckPrice = this.logic.getLastCheckPrice();
    this.emit('lastTimeCheckPrice', lastTimeCheckPrice);
  }
  done();
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
  if (result && result.err) {
    return false;
  }
  return result;
}

Trader.prototype.buy = function(callback) {
  this.exchange.getBalances((err, balances) => {
    if (balances && !err) {
      let amount = this.logic.getStepAssetAmount(balances);
      let enough = this.logic.hasEnoughCurrency(balances, amount);
      if (enough) {
        this.orderManager.createOrder('buy', amount, undefined, (err, result) => {
          if (result) {
            callback(undefined, result);
          } else {
            callback(err, undefined);
          }
        });
      } else {
        callback('Not enough currency to buy asset.', undefined);
      }
    } else {
      callback(err, undefined);
    }
  });
}

Trader.prototype.sell = function(order, callback) {
  this.exchange.getBalances((err, balances) => {
    if (balances && !err) {
      let enough = this.logic.hasEnoughAsset(balances, order.amountAsset);
      if (enough) {
        this.orderManager.sellOrder(order, (sellErr, result) => {
          if (result) {
            callback(undefined, result);
          } else {
            callback(sellErr, undefined);
          }
        });
      } else {
        callback('Not enough asset for sale this order.', undefined);
      }
    } else {
      callback(err, undefined);
    }
  });
}

Trader.prototype.pipelineControlProcess = function() {
  //console.log('pipelineControlProcessTimer this.config', this.config);
  let pipeCtrl = util.loadPipelineControlJsonFile(this.config);
  if (pipeCtrl && !pipeCtrl.err) {
    if (pipeCtrl.trader) {
      if (pipeCtrl.trader.action && pipeCtrl.trader.action.status === 'pending') {
        if (pipeCtrl.trader.action.name && this[pipeCtrl.trader.action.name] && this.isAllowedAction(pipeCtrl.trader.action.name)) {
          if (pipeCtrl.trader.action.args && pipeCtrl.trader.action.args.length > 0) {
            this[pipeCtrl.trader.action.name](...pipeCtrl.trader.action.args);
          } else {
            this[pipeCtrl.trader.action.name]();
          }
        }
        pipeCtrl.trader.action.status = 'done';
      }
      if (pipeCtrl.trader.actions && pipeCtrl.trader.actions.length) {
        _.each(pipeCtrl.trader.actions, (action, index) => {
          if (action && action.status === 'pending') {
            if (action.name && this[action.name]) {
              if (action.args && action.args.length > 0) {
                this[action.name](...action.args);
              } else {
                this[action.name]();
              }
            }
            pipeCtrl.trader.actions[index].status = 'done';
          }
        });
      } 
    }
    util.savePipelineControlJsonFile(pipeCtrl, this.config);
  } else {
    this.console.log('empty pipeline ctrl file...');
  }
}

Trader.prototype.isAllowedAction = function(actionName) {
  return allowedPipelineControlActions.includes(actionName);
}

Trader.prototype.emitOrders = function(orders) {
  this.emit('orders', orders);
}

Trader.prototype.emitTraderState = function() {
  let traderState = {};
  traderState.lastChangedUpCurrencyBalance = this.logic.balanceManager.getLastChangeUpBalances();
  traderState.stepCurrencyAmount = this.logic.getStepCurrencyAmount();
  this.emit('traderState', traderState);
}

/*
 * Pipeline actions
 * NOTE: action name should be added to 
 * allowedPipelineControlActions constant array!
 */
Trader.prototype.getTickerAction = function() {
  this.exchange.getTicker((err, ticker) => {
    if (ticker) {
      this.emit('getTickerAction', ticker);
    } else {
      this.emit('traderError', 'Get ticker fail: ' + err);
    }
  });
}

Trader.prototype.getBalancesAction = function() {
  this.exchange.getBalances((err, balances) => {
    if (balances) {
      this.console.log('balances: ', balances);
      let isChangeUp = this.logic.balanceManager.checkLastChangeUpBalances(balances);
      if (isChangeUp) {
        if (this.logic.balanceManager.updateLastChangeUpBalances(balances)) {
          this.console.log('update last change up balances.');
        } else {
          this.console.log('update last change up balances error.');
          this.emit('traderError', 'Trader: Logic: update last change up balances error.');
        }
      }
      let lastChangedUpCurrencyBalance = this.logic.balanceManager.getLastChangedUpCurrencyBalance();
      lastChangedUpCurrencyBalance.lastProfit = true;
      balances.push(lastChangedUpCurrencyBalance);   
      let balancesInitial = this.loadExchangeInitialBalances();
      let initialCurrencyBalance;
      if (balancesInitial !== false) {
        this.console.log('%s initial balances found.', balancesInitial.balances.length);
        initialCurrencyBalance = _.find(balancesInitial.balances, (initCurrencyBalance) => {
          if (initCurrencyBalance.name === this.config.currency) {
            return true;
          }
        });
        if (initialCurrencyBalance) {
          initialCurrencyBalance.initial = true;
          balances.push(initialCurrencyBalance);
        }
      }
      this.emit('getBalancesAction', balances);
    } else {
      this.emit('traderError', 'Get balances fail: ' + err);
    }
  });
}

Trader.prototype.saveInitialBalancesAction = function() {
  let loadResult = this.loadExchangeInitialBalances();
  if (loadResult === false) {
    this.exchange.getBalances((err, balances) => {
      if (balances && !err) {
        this.setExchangeInitialBalances(balances);
        this.saveExchangeInitialBalances(this.exchangeInitialBalances);
        this.emit('saveInitialBalancesAction', balances);
      } else {
        this.console.log('Save initial balances error: ', err);
        this.emit('traderError', 'Save initial balances fail: ' + err);
      }
    });
  }
}

Trader.prototype.loadInitialBalancesAction = function() {
  let balances = this.loadExchangeInitialBalances();
  if (balances !== false) {
    this.exchangeInitialBalances = balances;
    this.console.log('Load initial balances.');
    this.emit('loadInitialBalancesAction', balances);
  } else {
    this.console.log('Load initial balances fail.');
    this.emit('traderError', 'Load initial balances fail: ');
  }
}

Trader.prototype.sellAction = function(amount) {
  this.exchange.getBalances((err, balances) => {
    if (balances && !err) {
      let enough = this.logic.hasEnoughAsset(balances);
      if (enough) {
        let price = undefined;
        this.orderManager.createOrder('sell', amount, price, (err, result) => {
          if (result && result.orderId) {
            this.orderManager.updateOrdersFromExchange((syncErr, orders) => {
              if (orders && orders.length) {
                let eventData = { sellOrderId: result.orderId };
                this.emit('sellAction', eventData);
                this.emitOrders(orders);
              } else {
                this.console.log('Sell Action error (sync orders after): ', syncErr);
                this.emit('traderError', 'Sell Action error (sync orders after): ' + syncErr);
              }
            });
          } else {
            this.console.log('Sell Action error (create order): ', err);
            this.emit('traderError', 'Sell Action error (create order): ' + err);
          }
        });
      } else {
        this.console.log('Sell action fail (not enough asset).');
        this.emit('traderError', 'Sell action fail (not enough asset).');
      }
    } else {
      this.console.log('Sell action fail (get balances):', err);
      this.emit('traderError', 'Sell action fail (get balances): ' + err);  
    }
  });
}

Trader.prototype.buyAction = function(amount) {
  this.exchange.getBalances((err, balances) => {
    if (balances && !err) {
      let enough = this.logic.hasEnoughCurrency(balances, amount);
      if (enough) {
        let price = undefined;
        this.orderManager.createOrder('buy', amount, price, (err, result) => {
          if (result && result.orderId) {
            this.orderManager.updateOrdersFromExchange((syncErr, orders) => {
              if (orders && orders.length) {
                let eventData = { buyOrderId: result.orderId };
                this.emit('buyAction', eventData);
                this.emitOrders(orders);
              } else {
                this.console.log('Buy action fail (sync orders after): ', syncErr);
                this.emit('traderError', 'Buy action fail (sync orders after): ' + syncErr);
              }
            });
          } else {
            this.console.log('Buy action fail (create order): ', err);
            this.emit('traderError', 'Buy action fail (create order): ' + err);
          }
        });
      } else {
        this.console.log('Buy action fail (not enough currency).');
        this.emit('traderError', 'Buy action fail (not enough currency).');
      }
    } else {
      this.console.log('Buy action fail (get balances):', err);
      this.emit('traderError', 'Buy action fail (get balances): ' + err);  
    }
  });
}

Trader.prototype.sellOrderByIdAction = function(orderId) {
  this.console.log('sellOrderByIdAction: ', orderId);
  this.orderManager.updateOrdersFromExchange((err, orders) => {
    if (orders && orders.length) {
      let orderToSell = _.find(orders, (order) => {
        if (order.id == orderId) {
          return true;
        }
      });
      if (orderToSell) {
        this.sell(orderToSell, (sellErr, result) => {
          if (result && result.orderId) {
            this.orderManager.updateOrdersFromExchange((sellSyncErr, updatedOrders) => {
              if (updatedOrders && updatedOrders.length) {
                let eventData = { sellOrderId: result.orderId };
                this.emit('sell', eventData);
                this.emitOrders(updatedOrders);
              } else {
                this.console.log('Process candle fail (sell sync): ', sellSyncErr);
                this.emit('traderError', 'Process candle fail (sell sync): ' + sellSyncErr);
              }
            });
          } else {
            this.console.log('Process candle fail (sell): ', sellErr);
            this.emit('traderError', 'Process candle fail (sell): ' + sellErr);
          }
        });
      } else {
        this.console.log('Sell order by id action fail (incorrect order id):', err);
        this.emit('traderError', 'Sell order by id action fail (incorrect order id): ' + err);  
      }
    } else {
      this.console.log('Sell order by id action fail (sync orders before):', err);
      this.emit('traderError', 'Sell order by id action fail (sync orders before): ' + err);
    }
  });
}

Trader.prototype.getOrdersAction = function() {
  this.console.log('get orders action.');
  this.orderManager.updateOrdersFromExchange((err, orders) => {
    if (orders && orders.length) {
      //console.log(orders);
      this.emitOrders(orders);
    } else {
      this.console.log('there are no orders.');
      this.emit('traderError', 'Get orders action fail: ' + err);
    }
  });
}

Trader.prototype.realOrdersAction = function(isEnabled) {
  this.console.log('real orders action is enabled ', isEnabled);
  this.logic.setRealOrdersEnabled(isEnabled);
  let realOrdersEnabled = this.logic.isRealOrdersEnabled();
  if (realOrdersEnabled) {
    this.console.log('Real orders enabled. Be Careful!'.bold.yellow);
  } else {
    this.console.log('Real orders disabled.'.bold.green);
  }
  this.emit('realOrdersEnabled', realOrdersEnabled);
}

Trader.prototype.tradingAction = function(isEnabled) {
  this.console.log('trading action is enabled ', isEnabled);
  this.logic.setTradingEnabled(isEnabled);
  this.emit('tradingEnabled', this.logic.isTradingEnabled());
}

Trader.prototype.sellOnlyModeAction = function(isEnabled) {
  if (isEnabled) {
    this.console.log('Sell only mode ENABLED!'.bold.yellow);
  } else {
    this.console.log('Sell only mode DISABLED!'.bold.yellow);
  }
  this.logic.setSellOnlyMode(isEnabled);
  this.emit('sellOnlyModeAction', this.logic.getSellOnlyMode());
}

Trader.prototype.buyOnlyIfGoesDownAction = function(isEnabled) {
  if (isEnabled) {
    this.console.log('Buy only if price goes down mode ENABLED!'.bold.yellow);
  } else {
    this.console.log('Buy only if price goes down mode DISABLED!'.bold.yellow);
  }
  this.logic.setBuyOnlyIfGoesDownMode(isEnabled);
  this.emit('buyOnlyIfGoesDownAction', this.logic.getBuyOnlyIfGoesDownMode());
}

Trader.prototype.saveSettingsAction = function(settings) {
  let fileName = util.getMarketPairId(this.config) + '-settings.json';
  let result = util.saveJsonFile(fileName, util.dirs().pipelineControl, settings);
  if (settings) {
    if (settings.priceStepPcnt !== undefined) {
      this.logic.priceStepPcnt = settings.priceStepPcnt;
    }
    if (settings.stepAmountPcnt !== undefined) {
      this.logic.stepAmountPcnt = settings.stepAmountPcnt;
    }
    if (settings.candleSize !== undefined) {
      this.candleSize = settings.candleSize;
    }
    settings.stepAmountCurrency = this.logic.getStepCurrencyAmount();
    // if (settings.isTradingEnabled === true) {
    //   this.logic.setTradingEnabled(true);
    //   this.console.log('Trading process enabled.');
    // } else {
    //   this.logic.setTradingEnabled(false);
    //   this.console.log('Trading process disabled.');
    // }
    
    this.emit('loadSettingsAction', settings);

    // if (result.priceStepPcnt && result.priceStepPcnt > 0) {
    //   this.logic.priceStepPcnt = result.priceStepPcnt;
    //   if (result.stepAmountPcnt && result.stepAmountPcnt > 0) {
    //     this.logic.stepAmountPcnt = result.stepAmountPcnt;
    //     if (result.candleSize && result.candleSize > 0) {
    //       this.candleSize = result.candleSize;
    //       this.emit('loadSettingsAction', result);
    //     }
    //   }
    // } 
  } else {
    this.console.log('error loading settings.');
    this.emit('traderError', 'Load settings action fail.');
  }
}

Trader.prototype.loadSettingsAction = function() {
  let fileName = util.getMarketPairId(this.config) + '-settings.json';
  let result = util.loadJsonFile(fileName, util.dirs().pipelineControl);
  if (result && !result.err) {
    this.logic.priceStepPcnt = result.priceStepPcnt;
    this.logic.stepAmountPcnt = result.stepAmountPcnt;
    this.candleSize = result.candleSize;
    result.stepAmountCurrency = this.logic.getStepCurrencyAmount();
    this.emit('loadSettingsAction', result);
  } else {
    this.console.log('error loading settings.');
    this.emit('traderError', 'Load settings action fail.');
  }
}

Trader.prototype.testWithArgsAction = function(text) {
  this.emit('testWithArgsAction', {text: text});
}

Trader.prototype.enableOrderAction = function(orderId) {
  if (this.orderManager.enableOrderById(orderId)) {
    let orders = this.orderManager.getLocalMarketTypeOrders();
    this.emitOrders(orders);
  } else {
    this.console.log('enable order fail.');
    this.emit('traderError', 'enable order fail.');
  }
} 

Trader.prototype.disableOrderAction = function(orderId) {
  if (this.orderManager.disableOrderById(orderId)) {
    let orders = this.orderManager.getLocalMarketTypeOrders();
    this.emitOrders(orders);
  } else {
    this.console.log('disable order fail.');
    this.emit('traderError', 'disable order fail.');
  }
}

// teach our trader events
util.makeEventEmitter(Trader);
module.exports = Trader;
