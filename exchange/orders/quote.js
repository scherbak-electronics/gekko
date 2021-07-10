const _ = require('lodash');
const exchangeUtils = require('../exchangeUtils');
const util = require('../../core/util');
const bindAll = exchangeUtils.bindAll;
const moment = require('moment');
var colors = require('colors');

class Quote {
  config;
  isActive;
  items = [];
  
  constructor(config) {
    console.log('Order Manager: Quote: init..'); 
    this.config = config;
    this.resetIfNotExist();
    bindAll(this);
  }

  addItem(order) { 
    let quote = this.loadQuote();
    if (quote) {
      console.log('Order Manager: Quote: existing quote file loaded.');
      this.isActive = quote.isActive;
      this.items = quote.items;
      if (this.items && this.items.length) {
        console.log('Order Manager: Quote: %s existing items found.', this.items.length);
        // TODO: implement overwrite existing item
        
        _.each(this.items, (item, index) => {
          if (!item.id) {
            this.items[index] = undefined;
          } 
        });
        if (!this.items.length) {
          this.items = [];
        }
      } else {
        console.log('Order Manager: Quote: items not found.', this.items.length);
        this.items = [];
      }
    } else {
      console.log('Order Manager: Quote: new quote items init.');
      this.items = [];
    }
    this.isActive = true;
    this.items.push(order);
    return this.saveQuote({
      items: this.items,
      isActive: this.isActive
    });
  }

  updateQuote(order) {
    let quote = this.loadQuote();
    if (quote) {
      console.log('Order Manager: Quote: existing quote file loaded.');
      this.isActive = quote.isActive;
      this.items = quote.items;
      if (this.items && this.items.length) {
        console.log('Order Manager: Quote: %s existing items found.', this.items.length);
        _.each(this.items, (item, index) => {
          if (!item.id) {
            this.items[index].id = order.id;
            this.items[index].status = order.status;
            this.items[index].amountAsset = order.amountAsset;
            this.items[index].side = order.side;
            this.items[index].type = order.type;
            this.items[index].price = order.price;
            this.items[index].amountCurrency = order.amountCurrency;
          }
          return false;
        });
        return this.saveQuote({
          items: this.items,
          isActive: this.isActive
        });
      } else {
        console.log('Order Manager: Quote: items not found.');
        return false;
      }
    } else {
      console.log('Order Manager: Quote: quote not found.');
      return false;
    }
  }
  
  deleteQuoteItemById(orderId) {
    let quote = this.loadQuote();
    if (quote) {
      console.log('Order Manager: Quote: existing quote file loaded.');
      this.isActive = quote.isActive;
      this.items = quote.items;
      if (this.items && this.items.length) {
        console.log('Order Manager: Quote: %s existing items found.', this.items.length);
        _.each(this.items, (item, index) => {
          if (item.id === orderId) {
            this.items[index] = undefined;
          }
          return false;
        });
        if (!this.items.length) {
          this.isActive = false;
        } else {
          console.log('Order Manager: Quote: %s more existing items found.', this.items.length);
        }
        return this.saveQuote({
          items: this.items,
          isActive: this.isActive
        });
      } else {
        console.log('Order Manager: Quote: items not found.');
        return false;
      }
    } else {
      console.log('Order Manager: Quote: quote not found.');
      this.resetIfNotExist();
      return true;
    }
  }

  loadQuote() {
    let fileName = util.getMarketPairId(this.config) + '-quote.json';
    let result = util.loadJsonFile(fileName, util.dirs().spotOrders);
    if (result && result.length) {
      return result;
    } else {
      return false;
    }
  }

  saveQuote(quote) {
    let fileName = util.getMarketPairId(this.config) + '-quote.json';
    return util.saveJsonFile(fileName, util.dirs().spotOrders, quote);
  }

  resetIfNotExist() {
    let quote = this.loadQuote();
    if (!quote) {
      return this.resetQuote();
    }
  }

  resetQuote() {
    this.items = [];
    this.isActive = false;
    return this.saveQuote({
      items: this.items,
      isActive: this.isActive
    });
  }
}

module.exports = Quote;