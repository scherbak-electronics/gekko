const _ = require('lodash');
const async = require('async');
const events = require('events');
const moment = require('moment');
const errors = require('../exchangeErrors');
const StickyOrder = require('./sticky');
const states = require('./states');

class StickyBacktestOrder extends StickyOrder {
  constructor({api, marketConfig, capabilities}) {
    super(api, marketConfig, capabilities);
    this.orderSubmitSimulationTimeout = 1;
    this.checkOrderSimulationTimeout = 1;
    this.checkInterval = 1;
    this.createdOrderAmount = 0;
  }

  // SECO
  // create order simulation
  create(side, rawAmount, params = {}) {
    if(this.completed || this.completing) {
      return false;
    }
    console.log(new Date, 'sticky backtest create', side);
    this.side = side;
    this.amount = this.roundAmount(rawAmount);
    this.initialLimit = params.initialLimit;
    if(side === 'buy') {
      this.noLimit = true;
      this.limit = Infinity;
    } else {
      this.noLimit = true;
      this.limit = -Infinity;
    }
    this.status = states.SUBMITTED;
    this.emitStatus();
    this.orders = {};
    this.outbid = params.outbid && _.isFunction(this.outbidPrice);
    if(this.data && this.data.ticker) {
      this.price = this.calculatePrice(this.data.ticker);
      this.createOrder();
    } else {
      // SECO
      // exchange api getTicker simulation
      // this.api.getTicker((err, ticker) => {
      this.apiGetTicker((err, ticker) => {
        this.price = this.calculatePrice(ticker);
        this.createOrder();
      });
    }
    return this;
  }

  // SECO
  // fake submit
  // simulation of API call with  callback
  // todo: need to save submitted orders by id
  submit({side, amount, price, alreadyFilled}) {
    // saving amount for simulation    
    this.createdOrderAmount = amount;
    // SECO
    // generate new order id
    let orderId = Date.now();
    
    // SECO
    // API call with handleCreate callback simulation
    this.handleCreate(undefined, orderId);
  }

  // SECO
  // fake handleCreate
  // simulation of created order handler
  // todo: simulate handleInsufficientFundsError because it create new order
  handleCreate(err, id) {
    if(!id) {
      console.log('BLUP! no id...');
    }
    // potentailly clean up old order
    if(this.id && this.orders[this.id] && this.orders[this.id].filled === 0) {
      delete this.orders[this.id];
    }
    // register new order
    this.log(`${this.side} old id: ${this.id} new id: ${id}`);
    this.id = id;
    this.orders[id] = {
      price: this.price,
      filled: 0
    }
    this.emit('new fake order', this.id);
    this.emit('movelimit handled', new Date);
    this.status = states.OPEN;
    this.emitStatus();
    // this.scheduleNextCheck();
    this.checkOrder();
  }

  // SECO
  // todo: check what can be simulated here
  // dummy: always return false
  initiateDefferedAction() {
    // check whether we had an action pending
    // if(this.cancelling) {
    //  this.cancel();
    //  return true;
    // }

    // if(this.movingLimit && this.moveLimit()) {
    //   return true;
    // }

    // if(this.movingAmount) {
    //   this.moveAmount();
    //   return true;
    // }

    return false;
  }

  // SECO
  // simulated checkOrder method
  checkOrder() {
    if(this.completed || this.completing) {
      return console.log(new Date, this.side, 'checkOrder called on completed/completing order..', this.completed, this.completing);
    }
    if(this.status === states.MOVING) {
      return console.log(new Date, this.side, 'refusing to check, in the middle of move');
    }
    if(this.initiateDefferedAction()) {
      console.log(new Date, this.side, 'skipping check logic, better things to do - 0');
      return;
    }
    this.sticking = true;
    
    // SECO
    // simulate API call order check, so order always filled
    this.status = states.CHECKED;
    this.emitStatus();

    // it's not open right now
    // meaning we are done
    this.sticking = false;

    // order got filled!
    this.orders[this.id].filled = this.amount;

    this.emit('fill', this.amount);
    this.filled(this.price);
  }

  createSummary(next) {
    if(!this.completed) {
      console.log(new Date, 'createSummary BUT ORDER NOT COMPLETED!');
    }
    if(!next) {
      next = _.noop;
    }
    const checkOrders = _.keys(this.orders).map(id => next => {
      if(!this.orders[id].filled) {
        return next();
      }
      // SECO
      // simulate get order for summary
      setTimeout(() => this.apiGetOrderSimulation(id, next), this.checkInterval);
      // setTimeout(() => this.api.getOrder(id, next), this.checkInterval);
    });
    async.series(checkOrders, (err, trades) => {
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

  // SECO
  // todo: implement reading orders/trades from internal array by order id
  apiGetOrderSimulation(id, callback) {  
    let price = 0;
    let amount = 0;
    let date = moment(0);
    const fees = {};
    const trades = [];
    _.each(trades, trade => {
      date = moment(trade.time);
      price = ((price * amount) + (+trade.price * trade.qty)) / (+trade.qty + amount);
      amount += +trade.qty;
      if(fees[trade.commissionAsset])
        fees[trade.commissionAsset] += (+trade.commission);
      else
        fees[trade.commissionAsset] = (+trade.commission);
    });
    let feePercent;
    if(_.keys(fees).length === 1) {
      if(fees[this.asset]) {
        feePercent = fees[this.asset] / amount * 100;
      } else if(fees.currency) {
        feePercent = fees[this.currency] / price / amount * 100;
      } else {
        // use user fee of 10 basepoints
        feePercent = this.fee;
      }
    } else {
      // we paid fees in multiple currencies?
      // assume user fee
      feePercent = this.fee;
    }
    callback(undefined, { price, amount, date, fees, feePercent });
  }

  // SECO
  // todo: implement extracting tickers from backtest saved data
  apiGetTicker(callback) {
    let ticker = {
      bid: 0,
      ask: 0
    };
    callback(undefined, ticker);
  }
}

module.exports = StickyBacktestOrder;