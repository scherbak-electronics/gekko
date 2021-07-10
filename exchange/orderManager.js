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
    console.log('Order Manager: init'); 
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

  sellOrder(order, callback) {
    console.log('Order Manager: Sell existing order %s. amountAsset: %s'.red, order.id, order.amountAsset);
    this.createOrder('sell', order.amountAsset, undefined, (err, data) => {
      if (data && data.orderId) {
        let saveRes = this.updateOrderSellId(order.id, data.orderId);
        if (saveRes === true) {
          callback(undefined, data);
        } else {
          callback(saveRes, data);
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
            console.log('Order Manager: addOrder response data: ', data);
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
    console.log('Order Manager: updating orders..');
    this.api.getAllOrders((err, exchangeOrders) => {
      if (exchangeOrders && exchangeOrders.length) {
        console.log('Order Manager: %s orders received from exchange.', exchangeOrders.length);
        this.orders = this.loadOrders();
        if (this.orders === false) {
          this.orders = [];
        } 
        console.log('Order Manager: %s local orders found.', this.orders.length);
        console.log('Order Manager: checking new orders from exchange...');
        let newOrdersCounter = 0;
        if (this.orders.length) {
          _.each(exchangeOrders, (exchangeOrder) => {
            if (exchangeOrder.type == this.marketOrderTypeName) {
              let order = this.convertExchangeOrderToLocal(exchangeOrder);
              if (!this.isOrderExistById(this.orders, order.id)) {
                order.isEnabled = true;
                this.orders.push(order);
                newOrdersCounter++;
              }
              // if (this.quote.isActive) {
              //   let delRes = this.quote.deleteQuoteItemById(order.id);
              //   if (!delRes) {
              //     console.log('Order Manager: there are still items in the quote...');
              //   } 
              // }
            }
          });
        } else {
          _.each(exchangeOrders, (exchangeOrder) => {
            if (exchangeOrder.type == this.marketOrderTypeName) {
              let order = this.convertExchangeOrderToLocal(exchangeOrder);
              newOrdersCounter++;
              this.orders.push(order);
            }
          });
        }
        console.log('Order Manager: %s local orders found, including %s new orders.', this.orders.length, newOrdersCounter);
        //this.orders.reverse();
        this.saveOrders(this.orders);
        console.log('Order Manager: local orders saved back to file.');
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
    localOrder.time = exchangeOrder.time;
    localOrder.updateTime = exchangeOrder.updateTime;
    localOrder.readableTime = moment(exchangeOrder.time).format('YYYY-MM-DD HH:mm:ss');
    localOrder.readableUpdateTime = moment(exchangeOrder.updateTime).format('YYYY-MM-DD HH:mm:ss');
    return localOrder;
  }

  getOpenedMarketTypeOrders() {
    let openedOrders = [];
    console.log('Order Manager: Trying to find opened market orders...');
    _.each(this.orders, (order) => {
      if (order.type == this.marketOrderTypeName && order.side == this.buyOrderSideName && !order.sellId) {
        openedOrders.push(order);
      }
    });
    console.log('Order Manager: %s opened orders found', openedOrders.length);
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

  updateOrderSellId(id, sellId) {
    console.log('Order Manager: trying to update sell id');
    _.each(this.orders, (order, index) => {
      if (order.id === id) {
        this.orders[index].sellId = sellId;
        console.log('Order Manager: order %s sell id (%s) updated', this.orders[index].id, sellId);
        return false;
      }
    });
    return this.saveOrders(this.orders);
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
            console.log('Order Manager: order %s enabled', this.orders[index].id);
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
            console.log('Order Manager: order %s disabled', this.orders[index].id);
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
    console.log('Order Manager: Trying to find market orders...');
    _.each(localOrders, (order) => {
      if (order.type == this.marketOrderTypeName) {
        marketTypeOrders.push(order);
      }
    });
    console.log('Order Manager: %s market orders found', marketTypeOrders.length);
    return marketTypeOrders;
  }
}

module.exports = OrderManager;