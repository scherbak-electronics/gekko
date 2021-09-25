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
          'orders'
        ]
      },
      {
        name: 'settings.json',
        path: this.pairPath + 'order-manager/',
        createIfNotExist: true,
        propNames: [
          'realOrdersEnabled',
          'lastOpenedBuyOrderId',
          'openedBuyOrderIds',
          'enableDebugLog',
          'enableLog'
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
    this.lastOrder = {};
    this.lastOpenedBuyOrderId = 0;
    this.openedBuyOrderIds = [];
    this.enableDebugLog = false;
    this.enableLog = false;
    //this.priceStepUpPcnt = 0;
    //this.priceStepDownPcnt = 0;
    this.createNewFilesIfNotExist();
    this.readData();
    this.writeData('realOrdersEnabled', false);
  }

  sellOrder(buyOrder, callback) {
    this.console.log('Sell existing order %s. amountAsset: %s'.bold.yellow, buyOrder.id, buyOrder.amountAsset);
    this.createOrder('sell', buyOrder.amountAsset, undefined, (err, localSellOrder) => {
      if (localSellOrder && localSellOrder.id) {
        let saveRes = this.updateOrderSellId(buyOrder, localSellOrder);
        if (saveRes === true) {
          this.openedBuyOrderIds = this.readData('openedBuyOrderIds');
          if (this.openedBuyOrderIds && this.openedBuyOrderIds.length) {
            this.console.log('removing opened order %s'.grey, buyOrder.id);
            _.each(this.openedBuyOrderIds, (openedOrderId, index) => {
              if (openedOrderId == buyOrder.id) {
                this.openedBuyOrderIds.splice(index, 1);
              }
            });
            this.console.log('%s orders left'.grey, this.openedBuyOrderIds.length);
            this.writeData('openedBuyOrderIds', this.openedBuyOrderIds);
          }
          callback(undefined, localSellOrder);
        } else {
          callback(saveRes, localSellOrder);
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
        if (this.enableLog) {
          this.console.log('add order asset amount: %s', amountAsset);
        }
        this.api.addOrder(side, amountAsset, undefined, type, (err, data) => {
          if (this.enableLog) {
            this.console.log('addOrder response:'.grey);
          }
          if (data) {
            if (this.enableLog) {
              this.console.log('%s: %s', data.side, data.orderId);
            }
            if (this.enableDebugLog) {
              console.log(data);
            }
          }
          if (err) {
            if (this.enableLog) {
              this.console.log(err);
            }
            if (this.enableDebugLog) {
              console.log(data);
            }
          }
          if (data) {
            let localOrder = this.addOrderFromResponse(data);
            if (side == 'buy' && localOrder.id) {
              this.lastOpenedBuyOrderId = localOrder.id;
              if (this.enableDebugLog) {
                this.console.log('confirm avg. BUY order %s.'.grey, this.lastOpenedBuyOrderId);
              }
              this.writeData('lastOpenedBuyOrderId', this.lastOpenedBuyOrderId);
              this.addToOpenedOrderIds(localOrder.id);
            }
            callback(undefined, localOrder);
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
        if (this.orders.length) {
          let newOrdersCount = this.addNewOrdersIfNotExisting(exchangeOrders);
          this.console.log('%s new orders found from exchange', newOrdersCount);
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
              if (this.lastOrder && this.lastOrder.id == order.id) {
                order.isEnabled = true;  
              } else {
                order.isEnabled = false;
              }
              this.orders.push(order);
            }
          });
        }
        this.writeData('orders');
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
      if (exchangeOrder.fills && exchangeOrder.fills.length) {
        localOrder.amountCurrency = 0;
        localOrder.amountAsset = 0;
        _.each(exchangeOrder.fills, (fill) => {
          if (fill.commissionAsset == this.config.asset) {
            localOrder.amountCurrency += (Number(fill.qty) - Number(fill.commission)) * Number(fill.price);
            localOrder.amountAsset += Number(fill.qty) - Number(fill.commission);
          } else {
            localOrder.amountCurrency += (Number(fill.qty) * Number(fill.price)) - Number(fill.commission);
            localOrder.amountAsset += Number(fill.qty);
          }
          localOrder.price = fill.price;
        });
        localOrder.amountFilled = Number(exchangeOrder.executedQty);
      } else {
        let qtys = exchangeOrder.origQty && exchangeOrder.executedQty && exchangeOrder.cummulativeQuoteQty;
        if (qtys && exchangeOrder.executedQty == exchangeOrder.origQty && exchangeOrder.cummulativeQuoteQty > 0) {
          localOrder.amountAsset = Number(exchangeOrder.origQty);
          localOrder.amountCurrency = Number(exchangeOrder.cummulativeQuoteQty);
          localOrder.amountFilled = Number(exchangeOrder.executedQty);
          let price = localOrder.amountCurrency / localOrder.amountAsset;
          if (this.roundPrice) {
            localOrder.price = Number(this.roundPrice(price));
          } else {
            localOrder.price = Number((price).toFixed(6));
          }
        }
      }
    } else {
      if (exchangeOrder.status == 'CANCELED') {
        localOrder.amountAsset = 0;
        localOrder.amountCurrency = 0;
        localOrder.amountFilled = 0;
        localOrder.price = 0;
      } else {
        localOrder.amountAsset = Number(exchangeOrder.origQty);
        localOrder.amountCurrency = Number(exchangeOrder.cummulativeQuoteQty);
        localOrder.amountFilled = Number(exchangeOrder.executedQty);
        localOrder.price = Number(exchangeOrder.price);
      }
    }
    localOrder.status = exchangeOrder.status;
    localOrder.type = exchangeOrder.type;
    if (exchangeOrder.transactTime) {
      localOrder.time = exchangeOrder.transactTime;
    } else if (exchangeOrder.time) {
      localOrder.time = exchangeOrder.time;
    }
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

  getEnabledOpenedMarketOrders() {
    this.readData('orders');
    if (this.orders === false) {
      this.orders = [];
      //this.console.log('There are no local orders yet.'.grey);
      return this.orders;
    }
    let openedOrders = [];
    //this.console.log('Trying to find opened market orders...'.grey);
    _.each(this.orders, (order) => {
      if (order.isEnabled && !order.sellId && order.type == this.marketOrderTypeName && order.side == this.buyOrderSideName) {
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
    _.each(this.orders, (order, index) => {
      if (order.id === sellOrder.id) {
        this.orders[index] = this.setSellOrderProfit(sellOrder, buyOrder);
        return false;
      }
    });
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
    sellOrder.profitCurrency = Number((profitCurrency).toFixed(4));
    sellOrder.profitPcnt = Number((profitPcnt).toFixed(4));
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

  getEnabledMarketOrders() {
    let localOrders = this.readData('orders');
    let marketTypeOrders = [];
    this.console.log('Trying to find market orders...'.grey);
    _.each(localOrders, (order) => {
      if (order.isEnabled && order.type == this.marketOrderTypeName) {
        marketTypeOrders.push(order);
      }
    });
    this.console.log('%s market orders found'.grey, marketTypeOrders.length);
    return marketTypeOrders;
  }

  getOrders() {
    return this.getLocalMarketTypeOrders();
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

  removeDuplicatedOrders() {
    _.each(this.orders, (order, index) => {
      let foundCount = 0;  
      let foundOrder = _.find(this.orders, (findingOrder) => {
        if (order && findingOrder && order.id == findingOrder.id) {
          //this.console.log('foundOrder %s', order.id);
          foundCount++;
        }
      });
      if (foundCount > 1) {
        this.console.log('duplicated local orders: found %s identical orders', foundCount);
        this.orders.splice(index, foundCount - 1);
      }
    });
  }

  addNewOrdersIfNotExisting(exchangeOrders) {
    let newOrdersCount = 0;
    _.each(exchangeOrders, (exchangeOrder) => {
      if (exchangeOrder.type == this.marketOrderTypeName) {
        // TODO: move convert to api wraper
        let order = this.convertExchangeOrderToLocal(exchangeOrder);
        if (!this.isOrderExistById(this.orders, order.id)) {
          order.isEnabled = true;
          this.orders.push(order);
          newOrdersCount++;
        } 
      }
    });
    return newOrdersCount;
  }

  addToOpenedOrderIds(orderId) {
    this.openedBuyOrderIds = this.readData('openedBuyOrderIds');
    if (this.openedBuyOrderIds && this.openedBuyOrderIds.length) {
      this.openedBuyOrderIds.push(orderId);
      if (this.enableDebugLog) {
        this.console.log('order %s added to opened'.grey, orderId);
      }
    } else {
      this.openedBuyOrderIds = [];
      this.openedBuyOrderIds.push(orderId);
      if (this.enableDebugLog) {
        this.console.log('first order %s added to opened'.grey, orderId);
      }
    }
    this.writeData('openedBuyOrderIds', this.openedBuyOrderIds);
  }

  addOrderFromResponse(responseOrder) {
    this.readData('orders');
    let localOrder = this.convertExchangeOrderToLocal(responseOrder);
    localOrder.isEnabled = true;
    this.orders.push(localOrder);
    this.writeData('orders');
    return localOrder;
  }
}

module.exports = OrderManager;