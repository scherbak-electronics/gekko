const LogProxyClass = require('../core/log-proxy');
const BaseOrder = require('../core/seco/base-order');
const BaseModule = require('../core/seco/base-module');
const _ = require('lodash');
const async = require('async');
const errors = require('./exchangeErrors');

const exchangeUtils = require('./exchangeUtils');
const util = require('../core/util');
const bindAll = exchangeUtils.bindAll;
const moment = require('moment');
var colors = require('colors');

class OrderManager extends BaseModule {
  api;
  marketOrderTypeName;
  limitOrderTypeName;
  config;
  currentOrder;
  orders = [];
  marketConfig;
  interval;
  roundPrice;
  roundAmount;
  outbidPrice;
  market;
  constructor(config, exchange) {
    super(config);
    this.files = [
      {
        name: 'orders.json',
        path: this.pairPath + 'order-manager/',
        createIfNotExist: true,
        propNames: [
          'orders',
          'lastOpenedBuyOrder'
        ]
      },
      {
        name: 'settings.json',
        path: this.pairPath + 'order-manager/',
        createIfNotExist: true,
        propNames: [
          'realOrdersEnabled'
        ]
      }
    ];
    this.console = new LogProxyClass(config, 'Order Manager');
    this.console.log('init'); 
    this.api = exchange.api;
    this.capabilities = exchange.capabilities;
    this.marketConfig = exchange.marketConfig;
    this.interval = exchange.interval;
    this.roundPrice = exchange.roundPrice;
    this.roundAmount = exchange.roundAmount;
    this.outbidPrice = exchange.outbidPrice;
    this.market = exchange.market;
    this.marketOrderTypeName = 'MARKET'; // should be defined by exchange API
    this.limitOrderTypeName = 'LIMIT'; // should be defined by exchange API
    this.buyOrderSideName = 'BUY';
    this.sellOrderSideName = 'SELL';
    this.newStatusName = 'NEW';
    this.realOrdersEnabled = false;
    this.createNewFilesIfNotExist();
    this.readData();
    this.writeData('realOrdersEnabled', false);
  }

  sellOrder(buyOrder, callback) {
    this.console.log('Sell existing order %s. amountAsset: %s'.bold.yellow, buyOrder.id, buyOrder.amountAsset);
    this.createOrder('sell', buyOrder.amountAsset, undefined, (err, sellOrder) => {
      if (sellOrder && sellOrder.orderId) {
        let localSellOrder = this.convertExchangeOrderToLocal(sellOrder);
        let saveRes = this.updateOrderSellId(buyOrder, localSellOrder);
        if (saveRes === true) {
          callback(undefined, sellOrder);
        } else {
          callback(saveRes, sellOrder);
        }
      } else {
        callback(err, undefined);
      }
    });
  }

  createOrder(side, amount, price, callback) {
    //console.log('create order rawAmount ', rawAmount);
    let amountAsset = this.roundAmount(amount);
    let type = 'MARKET';
    if (type == 'MARKET') {
      let realOrdersEnabled = this.readData('realOrdersEnabled');
      if (realOrdersEnabled) {
        this.api.addOrder(side, amountAsset, undefined, type, (err, data) => {
          this.console.log('addOrder response:'.grey);
          if (data) {
            this.console.log(data);
          }
          if (err) {
            this.console.log(err);
          }
          if (data) { 
            if (side == 'buy') {
              this.lastOpenedBuyOrder = this.convertExchangeOrderToLocal(data);
            }
            callback(undefined, data);
          } else {
            callback(err, undefined);
          }
        });
      } else {
        this.console.log('creating orders disabled.'.bold.red);
        callback('error: real orders disabled!', undefined);
      }
    }
    return this;
  }

  /*
   * Save all orders to JSON file
   * overwriting existing orders
   * returns true or error message
   */  
  saveOrders(orders) {
    let fileName = util.getMarketPairId(this.config) + '-orders.json';
    return util.saveJsonFile(fileName, util.dirs().spotOrders, orders);
  }

  /*
   * Load all existing orders from JSON file 
   */
  loadOrders() {
    let fileName = util.getMarketPairId(this.config) + '-orders.json';
    let result = util.loadJsonFile(fileName, util.dirs().spotOrders);
    if (result && result.length) {
      return result;
    } else {
      return false;
    }
  }
  
  /*
   * Fetch all orders from exchange using exchange API call
   * callback fires on API response and orders received 
   */
  updateOrdersFromExchange(callback) {
    this.console.log('updating orders..'.grey);
    this.api.getAllOrders((err, exchangeOrders) => {
      if (exchangeOrders && exchangeOrders.length) {
        this.console.log('%s orders received from exchange.'.grey, exchangeOrders.length);
        this.readData('orders');
        if (this.orders === undefined) {
          this.orders = [];
        } 
        this.console.log('%s local orders found.'.grey, this.orders.length);
        this.console.log('checking new orders from exchange...'.grey);
        let newOrdersCounter = 0;
        if (this.orders.length) {
          _.each(this.orders, (order, index) => {
            let foundCount = 0;  
            let foundOrder = _.find(this.orders, (findingOrder) => {
              if (order && findingOrder && order.id == findingOrder.id) {
                //this.console.log('foundOrder %s', order.id);
                foundCount++;
              }
            });
            if (foundCount > 1) {
              //this.console.log('found %s the same orders', foundCount);
              this.orders.splice(index, foundCount - 1);
            }
          });
          _.each(exchangeOrders, (exchangeOrder) => {
            if (exchangeOrder.type == this.marketOrderTypeName) {
              // TODO: move convert to api wraper
              let order = this.convertExchangeOrderToLocal(exchangeOrder);
              if (!this.isOrderExistById(this.orders, order.id)) {
                order.isEnabled = true;
                this.orders.push(order);
                newOrdersCounter++;
              } 
            }
          });
          _.each(this.orders, (order, index) => {
            if (order.orderId && order.fills) {
              this.orders[index] = this.convertExchangeOrderToLocal(order);
              this.orders[index].isEnabled = true;
            }
            if (this.orders[index].side === this.sellOrderSideName && this.orders[index].isEnabled) {
              if (!this.orders[index].updateTime || !this.orders[index].readableTime) {
                this.orders[index].updateTime = this.orders[index].time;
              }
              if (!this.orders[index].profitCurrency && !this.orders[index].profitPcnt) {
                let buyOrder = _.find(this.orders, (thatOrder) => {
                  if (thatOrder.sellId == this.orders[index].id) {
                    return true;
                  }
                });
                if (buyOrder) {
                  this.orders[index] = this.setSellOrderProfit(this.orders[index], buyOrder);
                }
              }
            } 
          });
        } else {
          _.each(exchangeOrders, (exchangeOrder) => {
            if (exchangeOrder.type == this.marketOrderTypeName) {
              let order = this.convertExchangeOrderToLocal(exchangeOrder);
              order.isEnabled = false;
              newOrdersCounter++;
              this.orders.push(order);
            }
          });
        }
        //this.console.log('%s local orders found, including %s new orders.', this.orders.length, newOrdersCounter);
        //this.orders.reverse();
        this.writeData('orders');
        //this.console.log('local orders saved back to file.');
        callback(undefined, this.orders);
      } else {
        callback(err, exchangeOrders);
      }
    });
  }

  convertExchangeOrderToLocal(exchangeOrder) {
    let localOrder = new BaseOrder();
    localOrder.id = exchangeOrder.orderId;
    localOrder.side = exchangeOrder.side;
    if (exchangeOrder.type == this.marketOrderTypeName) {
      let qtys = exchangeOrder.origQty && exchangeOrder.executedQty && exchangeOrder.cummulativeQuoteQty;
      if (qtys && exchangeOrder.executedQty == exchangeOrder.origQty && exchangeOrder.cummulativeQuoteQty > 0) {
        localOrder.amountAsset = exchangeOrder.origQty;
        localOrder.amountCurrency = exchangeOrder.cummulativeQuoteQty;
        localOrder.amountFilled = exchangeOrder.executedQty;
        let price = localOrder.amountCurrency / localOrder.amountAsset;
        if (this.roundPrice) {
          localOrder.price = this.roundPrice(price);
        } else {
          localOrder.price = Number(price).toFixed(6);
        }
      }
    } else {
      if (exchangeOrder.status == 'CANCELED') {
        localOrder.amountAsset = 0;
        localOrder.amountCurrency = 0;
        localOrder.amountFilled = 0;
        localOrder.price = 0;
      } else {
        localOrder.amountAsset = exchangeOrder.origQty;
        localOrder.amountCurrency = exchangeOrder.cummulativeQuoteQty;
        localOrder.amountFilled = exchangeOrder.executedQty;
        localOrder.price = exchangeOrder.price;
      }
    }
    localOrder.status = exchangeOrder.status;
    localOrder.type = exchangeOrder.type;
    if (exchangeOrder.transactTime) {
      localOrder.time = exchangeOrder.transactTime;
    } else if (exchangeOrder.time) {
      localOrder.time = exchangeOrder.time;
    }
    
    //localOrder.updateTime = exchangeOrder.updateTime;
    //localOrder.readableTime = moment(exchangeOrder.time).format('YYYY-MM-DD HH:mm:ss');
    //localOrder.readableUpdateTime = moment(exchangeOrder.updateTime).format('YYYY-MM-DD HH:mm:ss');
    return localOrder;
  }

  getOpenedMarketTypeOrders() {
    this.readData('orders');
    if (this.orders === false) {
      this.orders = [];
      //this.console.log('There are no local orders yet.'.grey);
      return this.orders;
    }
    let openedOrders = [];
    //this.console.log('Trying to find opened market orders...'.grey);
    _.each(this.orders, (order) => {
      if (order.type == this.marketOrderTypeName && order.side == this.buyOrderSideName && !order.sellId) {
        openedOrders.push(order);
      }
    });
    //this.console.log('%s opened orders found'.grey, openedOrders.length);
    return openedOrders;
  }

  getClosedSellMarketTypeOrders() {
    this.readData('orders');
    if (this.orders === false) {
      this.orders = [];
      //this.console.log('There are no local orders yet.'.grey);
      return this.orders;
    }
    let closedOrders = [];
    //this.console.log('Trying to find opened market orders...'.grey);
    _.each(this.orders, (order) => {
      if (order.type == this.marketOrderTypeName && order.side == this.sellOrderSideName && order.profitCurrency) {
        closedOrders.push(order);
      }
    });
    //this.console.log('%s opened orders found'.grey, openedOrders.length);
    return closedOrders;
  }

  getClosedBuyMarketTypeOrders() {
    this.readData('orders');
    if (this.orders === false) {
      this.orders = [];
      //this.console.log('There are no local orders yet.'.grey);
      return this.orders;
    }
    let closedOrders = [];
    //this.console.log('Trying to find opened market orders...'.grey);
    _.each(this.orders, (order) => {
      if (order.type == this.marketOrderTypeName && order.side == this.buyOrderSideName && order.sellId) {
        closedOrders.push(order);
      }
    });
    //this.console.log('%s opened orders found'.grey, openedOrders.length);
    return closedOrders;
  }

  isOrderExistById(existingOrders, orderId) {
    let foundOrder = _.find(existingOrders, (existingOrder) => {
      if (existingOrder.id === orderId) {
        return true;
      }
    });
    if (foundOrder) {
      return true;
    } else {
      return false;
    }
  }

  updateOrderSellId(buyOrder, sellOrder) {
    this.console.log('trying to update sell id'.grey);
    this.readData('orders');
    _.each(this.orders, (order, index) => {
      if (order.id === buyOrder.id) {
        this.orders[index].sellId = sellOrder.id;
        this.orders[index].updateTime = sellOrder.time;
        this.console.log('order %s sell id (%s) updated'.grey, this.orders[index].id, sellOrder.id);
        return false;
      }
    });
    sellOrder = this.setSellOrderProfit(sellOrder, buyOrder);
    sellOrder.isEnabled = true;
    this.orders.push(sellOrder);
    this.writeData('orders', this.orders);
    return true;
  }

  setSellOrderProfit(sellOrder, buyOrder) {
    let profitCurrency = sellOrder.amountCurrency - buyOrder.amountCurrency;
    let priceDiffPcnt = util.getHowBiggerInPcnt(sellOrder.price, buyOrder.price);
    let profitPcnt;
    if (profitCurrency < 0) {
      profitPcnt = priceDiffPcnt
    } else {
      profitPcnt = (profitCurrency / buyOrder.amountCurrency) * 100;
    }
    sellOrder.profitCurrency = Number(profitCurrency).toFixed(2);
    sellOrder.profitPcnt = Number(profitPcnt).toFixed(2);
    return sellOrder;
  }

  enableOrderById(id) {
    this.readData('orders');
    if (this.orders) {
      _.each(this.orders, (order, index) => {
        if (order.id === id) {
          this.orders[index].isEnabled = true;
          this.console.log('order %s enabled'.grey, this.orders[index].id);
          return false;
        }
      });
      this.writeData('orders', this.orders);
      return true;
    }
    return false;
  }

  disableOrderById(id) {
    this.readData('orders');
    if (this.orders) {
      _.each(this.orders, (order, index) => {
        if (order.id === id) {
          this.orders[index].isEnabled = false;
          this.console.log('order %s disabled'.grey, this.orders[index].id);
          return false;
        }
      });
      this.writeData('orders');
      return true;
    }
    return false;
  }

  getLocalMarketTypeOrders() {
    let localOrders = this.readData('orders');
    let marketTypeOrders = [];
    this.console.log('Trying to find market orders...'.grey);
    _.each(localOrders, (order) => {
      if (order.type == this.marketOrderTypeName) {
        marketTypeOrders.push(order);
      }
    });
    this.console.log('%s market orders found'.grey, marketTypeOrders.length);
    return marketTypeOrders;
  }

  getTotalCurrencyProfit() {
    let total = 0;
    this.readData();
    if (this.orders && this.orders.length) {
      _.each(this.orders, (order) => {
        if (order.isEnabled && order.profitCurrency && order.profitCurrency > 0) {
          let profit = Number.parseFloat(Number(order.profitCurrency).toFixed(4));
          //this.console.log(profit);
          total += profit;
          //this.console.log('total: %s'.grey, total);
        }
      });
    }
    return total;
  }

  getOpenedAveragingBuyOrders() {
    this.readData('orders');
    if (this.orders === false) {
      this.orders = [];
      //this.console.log('There are no local orders yet.'.grey);
      return this.orders;
    }
    let avgOrders = [];
    //this.console.log('Trying to find opened market orders...'.grey);
    _.each(this.orders, (order) => {
      if (order.averagingStepNumber > 0 && order.type == this.marketOrderTypeName && order.side == this.buyOrderSideName && !order.sellId) {
        avgOrders.push(order);
      }
    });
    //this.console.log('%s opened orders found'.grey, openedOrders.length);
    return avgOrders;
  }
}

module.exports = OrderManager;