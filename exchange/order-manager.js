const LogProxyClass = require('../core/log-proxy');
const _ = require('lodash');
const async = require('async');
const errors = require('./exchangeErrors');
const BaseOrder = require('./orders/order');
const Quote = require('./orders/quote');
const exchangeUtils = require('./exchangeUtils');
const util = require('../core/util');
const bindAll = exchangeUtils.bindAll;
const states = require('./orders/states');
const moment = require('moment');
var colors = require('colors');

class OrderManager {
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
  quote;
  constructor(config, exchange) {
    this.console = new LogProxyClass(config, 'Order Manager');
    this.console.log('init'); 
    this.config = config;
    this.quote = new Quote(this.config);
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
    this.statusNewName = 'NEW';
    bindAll(this);
  }

  sellOrder(buyOrder, callback) {
    this.console.log('Sell existing order %s. amountAsset: %s'.red, buyOrder.id, buyOrder.amountAsset);
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
      // this.quote.addItem({
      //   side: side,
      //   status: this.statusNewName,
      //   type: type
      // });
      this.api.addOrder(side, amountAsset, undefined, type, (err, data) => {
          if (data) {
            // let res = this.quote.updateQuote({
            //   id: data.orderId,
            //   side: data.side,
            //   status: data.status,
            //   type: data.type
            // });
            // 
            callback(undefined, data);
            this.console.log('addOrder response data: ', data);
          } else {
            callback(err, undefined);
          }
        }
      );
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
    this.console.log('updating orders..');
    this.api.getAllOrders((err, exchangeOrders) => {
      if (exchangeOrders && exchangeOrders.length) {
        this.console.log('%s orders received from exchange.', exchangeOrders.length);
        this.orders = this.loadOrders();
        if (this.orders === false) {
          this.orders = [];
        } 
        this.console.log('%s local orders found.', this.orders.length);
        this.console.log('checking new orders from exchange...');
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
        this.console.log('%s local orders found, including %s new orders.', this.orders.length, newOrdersCounter);
        //this.orders.reverse();
        this.saveOrders(this.orders);
        this.console.log('local orders saved back to file.');
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
    this.orders = this.loadOrders();
    if (this.orders === false) {
      this.orders = [];
      this.console.log('There are no local orders yet.');
      return this.orders;
    }
    let openedOrders = [];
    this.console.log('Trying to find opened market orders...');
    _.each(this.orders, (order) => {
      if (order.type == this.marketOrderTypeName && order.side == this.buyOrderSideName && !order.sellId) {
        openedOrders.push(order);
      }
    });
    this.console.log('%s opened orders found', openedOrders.length);
    return openedOrders;
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
    this.console.log('trying to update sell id');
    this.orders = this.loadOrders();
    _.each(this.orders, (order, index) => {
      if (order.id === buyOrder.id) {
        this.orders[index].sellId = sellOrder.id;
        this.orders[index].updateTime = sellOrder.time;
        this.console.log('order %s sell id (%s) updated', this.orders[index].id, sellOrder.id);
        return false;
      }
    });
    sellOrder = this.setSellOrderProfit(sellOrder, buyOrder);
    sellOrder.isEnabled = true;
    this.orders.push(sellOrder);
    return this.saveOrders(this.orders);
  }

  setSellOrderProfit(sellOrder, buyOrder) {
    let profitCurrency = sellOrder.amountCurrency - buyOrder.amountCurrency;
    sellOrder.profitCurrency = Number(profitCurrency).toFixed(2);
    let profitPcnt = (sellOrder.profitCurrency / buyOrder.amountCurrency) * 100;
    sellOrder.profitPcnt = Number(profitPcnt).toFixed(2);
    return sellOrder;
  }

  enableOrderById(id) {
    if (this.quote && this.quote.isActive) {
      return false;
    } else {
      this.orders = this.loadOrders();
      if (this.orders) {
        _.each(this.orders, (order, index) => {
          if (order.id === id) {
            this.orders[index].isEnabled = true;
            this.console.log('order %s enabled', this.orders[index].id);
            return false;
          }
        });
        return this.saveOrders(this.orders);
      }
      return false;
    }
  }

  disableOrderById(id) {
    if (this.quote && this.quote.isActive) {
      return false;
    } else {
      this.orders = this.loadOrders();
      if (this.orders) {
        _.each(this.orders, (order, index) => {
          if (order.id === id) {
            this.orders[index].isEnabled = false;
            this.console.log('order %s disabled', this.orders[index].id);
            return false;
          }
        });
        return this.saveOrders(this.orders);;
      }
      return false;
    }
  }

  updateLocalOrders(newOrders) {
    _.each(newOrders, (newOrder) => {
      if (!this.isOrderExistById(this.orders, newOrder.id)) {
        this.orders.push(newOrder);
      }
    });
    return this.saveOrders(this.orders);
  }

  getLocalMarketTypeOrders() {
    let localOrders = this.loadOrders();
    let marketTypeOrders = [];
    this.console.log('Trying to find market orders...');
    _.each(localOrders, (order) => {
      if (order.type == this.marketOrderTypeName) {
        marketTypeOrders.push(order);
      }
    });
    this.console.log('%s market orders found', marketTypeOrders.length);
    return marketTypeOrders;
  }
}

module.exports = OrderManager;