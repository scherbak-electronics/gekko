const LogProxyClass = require('../../core/log-proxy');
const Logic = require('./logic');
const OrderManager = require('../../exchange/order-manager');
const Exchange = require('../../exchange/exchange');
const _ = require('lodash');
const util = require('../../core/util.js');
const config = util.getConfig();
const dirs = util.dirs();
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
  'buyOneStepAction',
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
  'sellOnlyModeAction',
  'getOpenedOrdersAction',
  'getClosedBuyOrdersAction',
  'getClosedSellOrdersAction',
  'averagingEnabledAction',
  'autoDisableSellOnlyModeAction'
];

const Trader = function(next)  {
  _.bindAll(this);
  this.config = {};
  this.config.key = config.trader.key;
  this.config.secret = config.trader.secret;
  this.config.exchange = config.watch.exchange;
  this.config.currency = config.watch.currency;
  this.config.asset = config.watch.asset; 
  this.config.inverted = config.watch.inverted;
  this.console = new LogProxyClass(this.config, 'Trader');
  this.console.log('init...');
  if (this.config.inverted) {
    this.console.log('inverted accumulation pair!'.yellow);
  }
  this.priceTickIntervalTime = 12000;
  this.sellMultipleProcessTime = 3333;
  this.sellMultipleOrdersCount = 0;
  this.sellMultipleOrderInProgress = false;
  this.sellMultipleActive = false;
  this.sellMultipleOrders = [];
  this.exchange = {};
  this.orderManager = {};
  this.logic = {};
  try {
    this.exchange = new Exchange(this.config)
    this.orderManager = new OrderManager(this.config, this.exchange);
    this.logic = new Logic(this.config, this.exchange, this.orderManager);
  } catch(e) {
    util.die(e.message);
  }
  this.sync(() => { next(); });
  this.loadSettingsAction();
  this.getTickerAction();
  this.getBalancesAction();
  this.getOrdersAction();
  this.processComplete = true;
  this.priceTickInterval = setInterval(this.priceTick, this.priceTickIntervalTime);
}

Trader.prototype.processCandle = function(candle, done) { done(); }

Trader.prototype.sync = function(next) {
  this.exchange.getTicker((err, ticker) => {
    if (ticker) {
      this.logic.setPrices(ticker);
      this.emit('getTickerActionResponse', ticker);
      this.console.log('%s \ %s sync.', ticker.ask, ticker.bid);
    } else {
      this.emit('traderError', 'Get ticker fail: ' + err);
    }
  });
  if (next) {
    next();
  }
}

Trader.prototype.priceTick = function() {
  this.exchange.getTicker((err, ticker) => {
    if (!err && ticker && ticker.ask && ticker.bid) {
      this.mainProcess(ticker);
      this.emit('getTickerActionResponse', ticker);
      //this.console.log('price tick: a: %s \ b: %s', ticker.ask, ticker.bid);
    } else {
      this.emit('traderError', 'Get ticker fail: ' + err);
    }
  });
}

Trader.prototype.mainProcess = function(ticker) {
  if (this.processComplete) {
    this.logic.setPrices(ticker);
    this.logic.readData();
    this.logic.initLastPrices();
    if (this.logic.tradingEnabled) {
      //this.console.log('trading active: (bid price: %s)', ticker.bid);
      let decision = this.logic.checkAllAndMakeDecision();
      if (decision.side === 'sell') {
        if (decision.orders.length == 1) {
          this.console.log('Found one order for sale. Sell it.'.grey);
          _.each(decision.orders, (order) => {
            this.processComplete = false;
            this.sell(order, (sellErr, result) => {
              if (result && result.id) {
                let updatedOrders = this.orderManager.getOrders();
                if (updatedOrders && updatedOrders.length) {
                  let eventData = { sellOrderId: result.id };
                  this.emit('sell', eventData);
                  this.emitOrders(updatedOrders);
                  this.getBalancesAction(() => {
                    this.processComplete = true;
                  });
                } else {
                  this.console.log('Process candle fail (sell no orders)');
                  this.emit('traderError', 'Process candle fail (sell no orders)');
                  this.processComplete = true;
                }
              } else {
                this.console.log('Process candle fail (sell): ', sellErr);
                this.emit('traderError', 'Process candle fail (sell): ' + sellErr);
                this.processComplete = true;
              }
            });
          });
        } else if (decision.orders.length > 1) {
          this.console.log('Found %s orders for sale. Sell multiple orders.'.grey, decision.orders.length);
          this.processComplete = false;
          this.sellMultiple(decision.orders, (sellMultErr, sellMultResultIds) => {
            if (sellMultResultIds && sellMultResultIds.length) {
              let updatedOrders = this.orderManager.getOrders();
              if (updatedOrders && updatedOrders.length) {
                let eventData = { sellOrderIds: sellMultResultIds };
                this.emit('sellMultiple', eventData);
                this.emitOrders(updatedOrders);
                this.getBalancesAction(() => {
                  this.processComplete = true;
                });
              } else {
                this.console.log('Process candle fail (sellMultiple no orders)');
                this.emit('traderError', 'Process candle fail (sellMultiple no orders)');
                this.processComplete = true;
              }
            } else {
              this.console.log('Process candle fail (sellMultiple sell): ', sellMultErr);
              this.emit('traderError', 'Process candle fail (sellMultiple sell): ' + sellMultErr);
              this.processComplete = true;
            }
          });
        }
      } else if (decision.side === 'sell_and_buy') {
        if (decision.orders.length == 1) {
          this.console.log('Found one order for sale. Sell and buy new one.'.grey);
          _.each(decision.orders, (order) => {
            this.processComplete = false;
            this.sell(order, (sellErr, result) => {
              if (result && result.id) {
                this.buy(decision.assetAmount, (buyErr, buyRes) => {
                  if (buyRes && buyRes.id) {
                    let updatedOrders = this.orderManager.getOrders();
                    if (updatedOrders && updatedOrders.length) {
                      let eventData = { 
                        sellOrderId: result.id, 
                        buyOrderId: buyRes.id
                      };
                      this.emit('sellAndBuy', eventData);
                      this.emitOrders(updatedOrders);
                      this.getBalancesAction(() => {
                        this.processComplete = true;
                      });
                    } else {
                      this.console.log('Process candle fail (sell_and_buy no orders)');
                      this.emit('traderError', 'Process candle fail (sell_and_buy no orders)');
                      this.processComplete = true;
                    }
                  } else {
                    this.console.log('Process candle fail (sell_and_buy buy): ' + buyErr);
                    this.emit('traderError', 'Process candle fail (sell_and_buy buy): ' + buyErr);
                    this.processComplete = true;
                  }
                });
              } else {
                this.console.log('Process candle fail (sell_and_buy sell): ', sellErr);
                this.emit('traderError', 'Process candle fail (sell_and_buy sell): ' + sellErr);
                this.processComplete = true;
              }
            });
          });
        } else if (decision.orders.length > 1) {
          this.console.log('Found %s orders for sale. Sell multiple and buy new one.'.grey, decision.orders.length);
          this.processComplete = false;
          this.sellMultiple(decision.orders, (sellMultErr, sellMultResultIds) => {
            if (sellMultResultIds && sellMultResultIds.length) {
              this.buy(decision.assetAmount, (buyErr, buyRes) => {
                if (buyRes && buyRes.id) {
                  let updatedOrders = this.orderManager.getOrders();
                  if (updatedOrders && updatedOrders.length) {
                    let eventData = { 
                      sellOrderIds: sellMultResultIds, 
                      buyOrderId: buyRes.id
                    };
                    this.emit('sellMultipleAndBuy', eventData);
                    this.emitOrders(updatedOrders);
                    this.getBalancesAction(() => {
                      this.processComplete = true;
                    });
                  } else {
                    this.console.log('Process candle fail (sellMultipleAndBuy no orders)');
                    this.emit('traderError', 'Process candle fail (sellMultipleAndBuy no orders)');
                    this.processComplete = true;
                  }
                } else {
                  this.console.log('Process candle fail (sellMultipleAndBuy buy): ' + buyErr);
                  this.emit('traderError', 'Process candle fail (sellMultipleAndBuy buy): ' + buyErr);
                  this.processComplete = true;
                }
              });
            } else {
              this.console.log('Process candle fail (sellMultipleAndBuy sell): ', sellMultErr);
              this.emit('traderError', 'Process candle fail (sellMultipleAndBuy sell): ' + sellMultErr);
              this.processComplete = true;
            }
          });
        }
      } else if (decision.side === 'sell_whole_balance') {
        this.processComplete = false;
        this.sellAction(undefined, () => {
          this.processComplete = true;
        });
      } else if (decision.side === 'buy') {
        this.console.log('Buy one step order.'.grey);
        this.processComplete = false;
        this.buy(decision.assetAmount, (buyErr, buyRes) => {
          if (buyRes && buyRes.id) {
            let updatedOrders = this.orderManager.getOrders();
            if (updatedOrders && updatedOrders.length) {
              let eventData = { buyOrderId: buyRes.id };
              this.emit('buy', eventData);
              this.emitOrders(updatedOrders);
              this.getBalancesAction(() => {
                this.processComplete = true;
              });
            } else {
              this.console.log('Process candle fail (buy no orders)');
              this.emit('traderError', 'Process candle fail (buy no orders)');
              this.processComplete = true;
            }
          } else {
            this.console.log('Process candle fail (buy): ' + buyErr);
            this.emit('traderError', 'Process candle fail (buy): ' + buyErr);
            this.processComplete = true;
          }
        });
      } else if (decision.priceGoes) {
        //this.console.log('Price changed one step %s.', decision.priceStepChangeDir);
      }
      this.emit('lastTimeCheckPrice', {
        lastStepBidPrice: this.logic.lastStepBidPrice,
        lastStepAskPrice: this.logic.lastStepAskPrice
      });
    }
    this.logic.writeData();
  }
}

Trader.prototype.buy = function(assetAmount, callback) {
  this.exchange.getBalances((err, balances) => {
    if (balances && !err) {
      this.logic.balanceManager.writeBalances(balances);
      let enough = this.logic.hasEnoughCurrencyToBuy(assetAmount);
      if (enough) {
        this.orderManager.createOrder('buy', assetAmount, undefined, (err, result) => {
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
      this.logic.balanceManager.writeBalances(balances);
      let enough = this.logic.hasEnoughAssetToSell(order.amountAsset);
      let wholeAssetAmount;
      let closePosition = false;
      if (!enough) {
        wholeAssetAmount = this.logic.getEnoughAssetAmountToSellWholeBalance();
        if (wholeAssetAmount) {
          //wholeAssetAmount = Number(wholeAssetAmount).toFixed(2) * 1;
          this.console.log('Selling last asset amount %s (%s$) and close position!'.green, wholeAssetAmount, (wholeAssetAmount * this.logic.bidPrice));
          order.amountAsset = wholeAssetAmount;
          enough = true;
          closePosition = true;
        }
      }
      if (enough) {
        this.orderManager.sellOrder(order, (sellErr, result) => {
          if (result) {
            if (closePosition && this.logic.autoDisableSellOnlyMode && this.logic.sellOnlyMode) {
              this.sellOnlyModeAction(false);
            }
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

Trader.prototype.sellMultiple = function(orders, callback) {
  this.sellMultipleOrders = orders;
  this.sellMultipleComplete = callback;
  this.sellMultipleActive = true;
  this.sellMultipleOrderInProgress = false;
  this.sellMultipleOrdersCount = orders.length;
  this.sellMultipleResultIds = [];
  this.sellMultipleInterval = setInterval(this.sellMultipleProcess, this.sellMultipleProcessTime);
}

/**
 * this method call for each order to sell 
 * when multiple orders found for sale
 */
Trader.prototype.sellMultipleProcess = function() {
  if (this.sellMultipleOrdersCount !== 0) {
    if (this.sellMultipleOrders && this.sellMultipleOrders.length) {
      if (!this.sellMultipleOrderInProgress) {
        let index = this.sellMultipleOrdersCount - 1;
        this.sellMultipleOrderInProgress = true;
        this.sell(this.sellMultipleOrders[index], (err, result) => {
          if (result && result.id) {
            this.sellMultipleResultIds.push(result.id);
          }
          this.sellMultipleOrdersCount--;
          this.sellMultipleOrderInProgress = false;
          this.console.log('one order processed. %s orders remains.'.grey, this.sellMultipleOrdersCount);
        });
      }
    }
  } else {
    if (this.sellMultipleActive) {
      if (this.sellMultipleResultIds.length) {
        this.sellMultipleComplete(undefined, this.sellMultipleResultIds);
        this.console.log('sell complete!'.grey);
      } else {
        this.sellMultipleComplete('Unable to sell multiple orders.'.grey, undefined);
      }
      this.sellMultipleActive = false;
      clearInterval(this.sellMultipleInterval);
    }
  }
}

Trader.prototype.isAllowedAction = function(actionName) {
  return allowedPipelineControlActions.includes(actionName);
}

Trader.prototype.emitOrders = function(orders) {
  this.emit('orders', orders);
}

/**
 * Entry point for all pipeline actions 
 * action method should be added to allowedPipelineControlActions
 */
Trader.prototype.pipelineAction = function(action) {
  //this.console.log('pipeline action call:');
  //console.log(action);
  if (action && action.name) {
    if (this.isAllowedAction(action.name) && this[action.name]) {
      if (action.args && action.args.length > 0) {
        this[action.name](...action.args);
      } else {
        this[action.name]();
      }
    }
  }
}

/** 
 * Pipeline actions
 * NOTE: action name should be added to 
 * allowedPipelineControlActions constant array!
 */
Trader.prototype.getTickerAction = function() {
  this.exchange.getTicker((err, ticker) => {
    if (ticker) {
      this.emit('getTickerActionResponse', ticker);
    } else {
      this.emit('traderError', 'Get ticker fail: ' + err);
    }
  });
}

Trader.prototype.getBalancesAction = function(callback) {
  this.exchange.getBalances((err, balances) => {
    if (balances) {
      this.logic.balanceManager.writeBalances(balances);
      //this.console.log('balances: ', balances);
      let result = this.logic.balanceManager.readData();
      let tradingCurrencyAmountAvailable = this.logic.balanceManager.getTradingCurrencyAmountAvailable();
      let stepCurrencyAmount = this.logic.getStepCurrencyAmount();
      if (tradingCurrencyAmountAvailable < stepCurrencyAmount) {
        this.sellOnlyModeAction(true);
      } else {
        this.sellOnlyModeAction(false);
      }
      result.ordersTotalCurrencyProfit = this.orderManager.getTotalCurrencyProfit();
      this.emit('getBalancesActionResponse', result);
      this.loadSettingsAction();
    } else {
      this.emit('traderError', 'Get balances fail: ' + err);
    }
    if (callback) {
      callback();
    }
  });
}

Trader.prototype.sellAction = function(amount, callback) {
  this.exchange.getBalances((err, balances) => {
    if (balances && !err) {
      this.logic.balanceManager.writeBalances(balances);
      let enough = false;
      let closePosition = false;
      if (amount === undefined) {
        amount = this.logic.getEnoughAssetAmountToSellWholeBalance();
        if (amount) {
          enough = true;
          closePosition = true;
        }
      } else {
        enough = this.logic.hasEnoughAssetToSell(amount);
      }
      if (enough) {
        let price = undefined;
        this.orderManager.createOrder('sell', amount, price, (err, result) => {
          if (result && result.id) {
            if (closePosition && this.logic.autoDisableSellOnlyMode && this.logic.sellOnlyMode) {
              this.sellOnlyModeAction(false);
            }
            let orders = this.orderManager.getOrders();
            if (orders && orders.length) {
              let eventData = { sellOrderId: result.id };
              this.emit('sellActionResponse', eventData);
              this.emitOrders(orders);
              this.getBalancesAction(callback);
            } else {
              this.console.log('Sell Action error (sync orders after): ', syncErr);
              this.emit('traderError', 'Sell Action error (sync orders after): ' + syncErr);
              callback();
            }
          } else {
            this.console.log('Sell Action error (create order): ', err);
            this.emit('traderError', 'Sell Action error (create order): ' + err);
            callback();
          }
        });
      } else {
        this.console.log('Sell action fail (not enough asset).');
        this.emit('traderError', 'Sell action fail (not enough asset).');
        callback();
      }
    } else {
      this.console.log('Sell action fail (get balances):', err);
      this.emit('traderError', 'Sell action fail (get balances): ' + err);  
      callback();
    }
  });
}

Trader.prototype.buyAction = function(amount) {
  this.exchange.getBalances((err, balances) => {
    if (balances && !err) {
      this.logic.balanceManager.writeBalances(balances);
      let enough = this.logic.hasEnoughCurrencyToBuy(amount);
      if (enough) {
        let price = undefined;
        this.orderManager.createOrder('buy', amount, price, (err, result) => {
          if (result && result.id) {
            let orders = this.orderManager.getOrders();
            if (orders && orders.length) {
              let eventData = { buyOrderId: result.id };
              this.emit('buyActionResponse', eventData);
              this.emitOrders(orders);
              this.getBalancesAction();
            } else {
              this.console.log('Buy action fail (sync orders after): ', syncErr);
              this.emit('traderError', 'Buy action fail (sync orders after): ' + syncErr);
            }
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

Trader.prototype.buyOneStepAction = function() {

}

Trader.prototype.sellOrderByIdAction = function(orderId) {
  this.console.log('sellOrderByIdAction: ', orderId);
  let orders = this.orderManager.getOrders();
  if (orders && orders.length) {
    let orderToSell = _.find(orders, (order) => {
      if (order.id == orderId) {
        return true;
      }
    });
    if (orderToSell) {
      this.sell(orderToSell, (sellErr, result) => {
        if (result && result.id) {
          let updatedOrders = this.orderManager.getOrders();
          if (updatedOrders && updatedOrders.length) {
            let eventData = { sellOrderId: result.id };
            this.emit('sell', eventData);
            this.emitOrders(updatedOrders);
            this.getBalancesAction();
          } else {
            this.console.log('Process candle fail (sell sync): ', sellSyncErr);
            this.emit('traderError', 'Process candle fail (sell sync): ' + sellSyncErr);
          }
        } else {
          this.console.log('Process candle fail (sell): ', sellErr);
          this.emit('traderError', 'Process candle fail (sell): ' + sellErr);
        }
      });
    } else {
      this.console.log('Sell order by id action fail (incorrect order id)');
      this.emit('traderError', 'Sell order by id action fail (incorrect order id)');  
    }
  } else {
    this.console.log('Sell order by id action fail (no orders)');
    this.emit('traderError', 'Sell order by id action fail (no orders)');
  }
}

Trader.prototype.getOrdersAction = function() {
  this.console.log('get orders action.'.grey);
  let orders = this.orderManager.getOrders();
  if (orders && orders.length) {
    //console.log(orders);
    this.emitOrders(orders);
  } else {
    this.emitOrders([]);
  }
}

Trader.prototype.getOpenedOrdersAction = function() {
  this.console.log('get opened orders action.'.grey);
  let openedOrders = this.orderManager.getOpenedMarketTypeOrders()
  if (openedOrders && openedOrders.length) {
    this.emitOrders(openedOrders);
  } else {
    this.emitOrders([]);
  }
}

Trader.prototype.getClosedBuyOrdersAction = function() {
  this.console.log('get closed buy orders action.'.grey);
  let closedOrders = this.orderManager.getClosedBuyMarketTypeOrders();
  if (closedOrders && closedOrders.length) {
    this.emitOrders(closedOrders);
  } else {
    this.emitOrders([]);
  }
}

Trader.prototype.getClosedSellOrdersAction = function() {
  this.console.log('get closed sell orders action.'.grey);
  let closedOrders = this.orderManager.getClosedSellMarketTypeOrders();
  if (closedOrders && closedOrders.length) {
    this.emitOrders(closedOrders);
  } else {
    this.emitOrders([]);
  }
}

Trader.prototype.realOrdersAction = function(isEnabled) {
  this.console.log('real orders action is enabled '.grey, isEnabled);
  this.orderManager.writeData('realOrdersEnabled', isEnabled);
  let realOrdersEnabled = this.orderManager.readData('realOrdersEnabled');
  if (realOrdersEnabled) {
    this.console.log('Real orders enabled. Be Careful!'.bold.yellow);
  } else {
    this.console.log('Real orders disabled.'.bold.green);
  }
  if (isEnabled === realOrdersEnabled) {
    this.emit('traderSuccess', true);
  } else {
    this.emit('traderError', 'realOrdersAction error');
  }
}

Trader.prototype.tradingAction = function(isEnabled) {
  this.console.log('trading action is enabled '.grey, isEnabled);
  this.logic.writeData('tradingEnabled', isEnabled);
  if (isEnabled === this.logic.readData('tradingEnabled')) {
    this.emit('traderSuccess', true);
  } else {
    this.emit('traderError', 'tradingAction error');
  }
}

Trader.prototype.sellOnlyModeAction = function(isEnabled) {
  if (isEnabled) {
    this.console.log('Sell only mode ENABLED!'.bold.yellow);
  } else {
    this.console.log('Sell only mode DISABLED!'.bold.yellow);
  }
  this.logic.writeData('sellOnlyMode', isEnabled);
  if (isEnabled === this.logic.readData('sellOnlyMode')) {
    this.emit('traderSuccess', true);
  } else {
    this.emit('traderError', 'sellOnlyModeAction error');
  }
}

Trader.prototype.buyOnlyIfGoesDownAction = function(isEnabled) {
  if (isEnabled) {
    this.console.log('Buy only if price goes down mode ENABLED!'.bold.yellow);
  } else {
    this.console.log('Buy only if price goes down mode DISABLED!'.bold.yellow);
  }
  this.logic.writeData('buyOnlyIfGoesDownMode', isEnabled);
  if (isEnabled === this.logic.readData('buyOnlyIfGoesDownMode')) {
    this.emit('traderSuccess', true);
  } else {
    this.emit('traderError', 'buyOnlyIfGoesDownAction error');
  }
}

Trader.prototype.saveSettingsAction = function(settings) {
  if (settings) {
    this.logic.balanceManager.setTradingCurrencyAmountAvailable(settings.tradingCurrencyAmount);
    this.logic.balanceManager.writeData(undefined, settings);
    this.orderManager.writeData(false, settings);
    this.logic.writeData(false, settings);
    this.config.candleSize = this.logic.candleSize;
    let result = this.logic.readData(undefined);
    result.realOrdersEnabled = this.orderManager.readData('realOrdersEnabled');
    this.logic.balanceManager.readData();
    result.tradingCurrencyProfitPcnt = this.logic.balanceManager.tradingCurrencyProfitPcnt;
    result.tradingCurrencyAmount = this.logic.balanceManager.tradingCurrencyAmount;
    result.reservedCurrencyAmount = this.logic.balanceManager.reservedCurrencyAmount;
    this.emit('saveSettingsActionResponse', result);
  } else {
    this.console.log('error loading settings.');
    this.emit('traderError', 'Save settings action fail.');
  }
}

Trader.prototype.loadSettingsAction = function() {
  this.console.log('load settings...'.grey);
  let result = this.logic.readData(undefined);
  result.realOrdersEnabled = this.orderManager.readData('realOrdersEnabled');
  this.config.candleSize = this.logic.candleSize;
  
  this.logic.balanceManager.readData();
  result.reservedCurrencyAmount = this.logic.balanceManager.reservedCurrencyAmount;
  result.tradingCurrencyAmount = this.logic.balanceManager.tradingCurrencyAmount;
  result.tradingCurrencyProfitPcnt = this.logic.balanceManager.tradingCurrencyProfitPcnt;
  this.console.log('realOrdersEnabled: %s,  tradingEnabled: %s'.grey, result.realOrdersEnabled, result.tradingEnabled);
  if (result) {
    this.emit('loadSettingsActionResponse', result);
  } else {
    this.console.log('error loading settings.');
    this.emit('traderError', 'Load settings action fail.');
  }
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

Trader.prototype.averagingEnabledAction = function(isEnabled) {
  if (isEnabled) {
    this.console.log('averaging mode ENABLED!'.bold.yellow);
  } else {
    this.console.log('averaging mode DISABLED!'.bold.yellow);
  }
  this.logic.writeData('averagingEnabled', isEnabled);
  if (isEnabled === this.logic.readData('averagingEnabled')) {
    this.emit('traderSuccess', true);
  } else {
    this.emit('traderError', 'averagingEnabledAction error');
  }
}

Trader.prototype.autoDisableSellOnlyModeAction = function(isEnabled) {
  if (isEnabled) {
    this.console.log('auto Disable Sell Only mode ENABLED!'.bold.yellow);
  } else {
    this.console.log('auto Disable Sell Only Mode DISABLED!'.bold.yellow);
  }
  this.logic.writeData('autoDisableSellOnlyMode', isEnabled);
  if (isEnabled === this.logic.readData('autoDisableSellOnlyMode')) {
    this.emit('traderSuccess', true);
  } else {
    this.emit('traderError', 'autoDisableSellOnlyModeAction error');
  }
}


// teach our trader events
util.makeEventEmitter(Trader);
module.exports = Trader;
