const _ = require('lodash');
const async = require('async');
const errors = require('./exchangeErrors');
const BaseOrder = require('./orders/order');
const exchangeUtils = require('./exchangeUtils');
const util = require('../core/util');
const bindAll = exchangeUtils.bindAll;
const states = require('./orders/states');
const moment = require('moment');

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
  constructor(config, exchange) {
    console.log('Order Manager: init'); 
    this.config = config;
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
    bindAll(this);
  }

  createOrder(side, amount, price, callback) {
    //console.log('create order rawAmount ', rawAmount);
    let amountAsset = this.roundAmount(amount);
    let type = 'MARKET';
    if (type == 'MARKET') {
      this.api.addOrder(side, amountAsset, undefined, type, (err, data) => {
          if (data) {
            this.syncOrdersFromExchange(callback);
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
   * Save single order to JSON file
   * overwrite existing order
   * add new if not existing
   * returns true or error message
   */
  saveOrder(order) {
    let existingOrders = this.loadOrders();
    if (existingOrders) {
      if (existingOrders.err) {
        return existingOrders.err;
      } else {
        let orderExist = false;
        let orders = existingOrders.map(function(existingOrder){
          if (existingOrder.id === order.id) {
            existingOrder = order;
            orderExist = true;
          }
          return existingOrder;
        });
        if (!orderExist) {
          orders.push(order);
        }
        return this.saveOrders(orders); 
      }
    }
  }

  /*
   * Save all orders to JSON file
   * overwriting existing orders
   * returns true or error message
   */  
  saveOrders(orders) {
    let fileName = util.getMarketPairId(this.config) + '-orders.json';
    let result = util.saveJsonFile(fileName, util.dirs().spotOrders, orders);
    if (result && result.err) {
      return result.err;
    } else {
      return true;
    }
  }

  /*
   * Load all existing orders from JSON file 
   */
  loadOrders() {
    let fileName = util.getMarketPairId(this.config) + '-orders.json';
    let result = util.loadJsonFile(fileName, util.dirs().spotOrders);
    return result;
  }
  
  loadOrder(orderId) {}

  /*
   * Fetch all orders from exchange using exchange API call
   * callback fires on API response and orders received 
   */
  syncOrdersFromExchange(callback) {
    this.api.getAllOrders((err, exchangeOrders) => {
      if(exchangeOrders && exchangeOrders.length) {
        this.orders = [];
        _.each(exchangeOrders, (exchangeOrder) => {
          let order = this.convertExchangeOrderToLocal(exchangeOrder);
          this.orders.push(order);
        });
        let saveRes = this.saveOrders(this.orders);
        if (saveRes !== true) {
          let saveErr = saveRes;
          callback(saveErr, undefined);
        } else {
          callback(undefined, this.orders);
        }
      } else {
        callback(err, exchangeOrders);
      }
    });
  }

  /*
   * Compares local order fields with exchange order fields
   * returns true if orders data equal or object if not 
   */
  compareLocalOrderWithExchange(local, exchange) {
    return true;
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

  checkOrder() {
    if (this.completed || this.completing) {
      return console.log(new Date, this.side, 'checkOrder called on completed/completing order..', this.completed, this.completing);
    }
    if (this.status === states.MOVING) {
      return console.log(new Date, this.side, 'refusing to check, in the middle of move');
    }
    if (this.initiateDefferedAction()) {
      console.log(new Date, this.side, 'skipping check logic, better things to do - 0');
      return;
    }
    this.sticking = true;
    const checkId = this.id;
    this.api.checkOrder(this.id, (err, result) => {
      let saveData = {};
      saveData.result = result;
      saveData.err = err;
      util.saveJsonFile('order4_checkOrder_after_api_call.json', util.dirs().root, saveData);
      if (!this.debug) {
        if (this.ignoreCheckResult) {
          this.log(this.side + ' debug ignoring check result');
          this.ignoreCheckResult = false;
          return;
        }
      }
      if (this.status === states.MOVING) {
        this.log(`${this.side} ${this.id} debug ignoring check result - in the middle of move`);
        this.ignoreCheckResult = false;
        return;
      }
      if (checkId !== this.id) {
        this.log(this.side + ' debug got check on old id ' + checkId + ', ' + this.id);
        this.ignoreCheckResult = false;
        return;
      }
      this.status = states.CHECKED;
      this.emitStatus();
      if (this.handleError(err)) {
        console.log(new Date, 'checkOrder error');
        return;
      }
      if (result.open) {
        if (result.filledAmount !== this.orders[this.id].filled) {
          this.orders[this.id].filled = result.filledAmount;
          this.emit('fill', this.calculateFilled());
        }
        // if we are already at limit we dont care where the top is
        // note: might be string VS float
        if (this.price == this.limit) {
          this.scheduleNextCheck();
          return;
        }
        if (this.initiateDefferedAction()) {
          console.log(new Date, this.side, 'skipping check ticker logic, better things to do 1');
          return;
        }
        this.api.getTicker((err, ticker) => {
          if (this.handleError(err)) {
            console.log(new Date, 'getTicker error');
            return;
          }
          if (this.initiateDefferedAction()) {
            console.log(new Date, this.side, 'skipping check ticker logic, better things to do 2');
            return;
          }
          if (this.status === states.MOVING) {
            this.log(`${this.side} ${this.id} debug ignoring check result - in the middle of move     ---- 2`);
            this.ignoreCheckResult = false;
            return;
          }
          this.ticker = ticker;
          this.emit('ticker', ticker);
          const bookSide = this.side === 'buy' ? 'bid' : 'ask';
          // note: might be string VS float
          if (ticker[bookSide] != this.price) {
            return this.move(this.calculatePrice(ticker));
          } else {
            this.scheduleNextCheck();
          }
        });
        return;
      }
      // it's not open right now
      // meaning we are done
      this.sticking = false;
      if(!result.executed) {
        // not open and not executed means it never hit the book
        console.log(this.side, this.status, this.id, 'not open not executed!', result);
        this.rejected();
        throw 'a';
        return;
      }
      // order got filled!
      this.orders[this.id].filled = this.amount;
      this.emit('fill', this.amount);
      this.filled(this.price);
      saveData = {};
      saveData.context = {};
      saveData.context.id = this.id;
      util.saveJsonFile('order5_checkOrder_after_filled.json', util.dirs().root, saveData);
    });
    this.status = states.CHECKING;
    this.emitStatus();
  }

  // global error handler
  handleError(error) {
    if(!error) {
      return false;
    }
    console.log(new Date, '[sticky order] FATAL ERROR', error.message);
    console.log(new Date, error);
    this.status = states.ERROR;
    this.emitStatus();
    this.error = error;
    this.emit('error', error);
    return true;
  }

  createSummary(next) {
    if (!this.completed) {
      console.log(new Date, 'createSummary BUT ORDER NOT COMPLETED!');
    }
    if (!next) {
      next = _.noop;
    }
    const checkOrders = _.keys(this.orders).map(id => next => {
      if(!this.orders[id].filled) {
        return next();
      }
      let saveData = {};
      saveData.orderId = id;
      util.saveJsonFile('order_createSummary_before_checkOrders.json', util.dirs().root, saveData);
      setTimeout(() => this.api.getOrder(id, next), this.checkInterval);
    });
    async.series(checkOrders, (err, trades) => {
      let saveData = {};
      saveData.orderId = id;
      util.saveJsonFile('order_createSummary_after_series_checkOrders.json', util.dirs().root, saveData);
      // note this is a standalone function after the order is
      // completed, as such we do not use the handleError flow.
      if(err) {
        console.log(new Date, 'error createSummary (checkOrder)')
        return next(err);
      }
      let price = 0;
      let amount = 0;
      let date = moment(0);
      _.each(trades, trade => {
        if(!trade) {
          return;
        }
        // last fill counts
        date = moment(trade.date);
        price = ((price * amount) + (+trade.price * trade.amount)) / (+trade.amount + amount);
        amount += +trade.amount;
      });
      const summary = {
        price,
        amount,
        date,
        side: this.side,
        orders: trades.length
      }
      const first = _.first(trades);
      if(first && first.fees) {
        summary.fees = {};
        _.each(trades, trade => {
          if(!trade) {
            return;
          }
          _.each(trade.fees, (amount, currency) => {
            if(!_.isNumber(summary.fees[currency])) {
              summary.fees[currency] = amount;
            } else {
              summary.fees[currency] += amount;
            }
          });
        });
      }
      if(first && !_.isUndefined(first.feePercent)) {
        summary.feePercent = 0;
        let amount = 0;
        _.each(trades, trade => {
          if(!trade || _.isUndefined(trade.feePercent)) {
            return;
          }
          if(trade.feePercent === 0) {
            return;
          }
          summary.feePercent = ((summary.feePercent * amount) + (+trade.feePercent * trade.amount)) / (+trade.amount + amount);
          amount += +trade.amount;
        });
      }
      this.emit('summary', summary);
      next(undefined, summary);
    });
  }
}

module.exports = OrderManager;