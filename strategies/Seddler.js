// Seddler strategy for Gekko.
// For more information on everything please refer
// to this document:
//
// https://gekko.wizb.it/docs/strategies/creating_a_strategy.html

var log = require('../core/log');
var config = require('../core/util.js').getConfig();

// Let's create our own strat
var strat = {};

// Prepare everything our method needs
strat.init = function() {
  this.input = 'candle';
  this.currentTrend = 'long';
  this.requiredHistory = config.tradingAdvisor.historySize;
  this.prevPrice = 0;
  this.priceChangePercent = 5;
}

// What happens on every new candle?
strat.update = function(candle) {
  this.toUpdate = false;
  if (this.prevPrice === 0) {
    this.prevPrice = candle.vwp;
    console.log('set prev price');
    console.log(candle);
    this.toUpdate = true;
  } else {
    /*
    If the price increased, use the formula [(New Price - Old Price)/Old Price] 
    and then multiply that number by 100. If the price decreased, 
    use the formula [(Old Price - New Price)/Old Price] and multiply that number by 100.
    */
    var priceChangePercent = 0;
    var priceDirection = '';
    if (this.prevPrice < candle.vwp) {
      priceChangePercent = ((candle.vwp - this.prevPrice) / this.prevPrice) * 100;
      priceDirection = 'up';
    } else {
      priceChangePercent = ((this.prevPrice - candle.vwp) / this.prevPrice) * 100;
      priceDirection = 'down';
    }
    if (priceChangePercent >= this.priceChangePercent) {
      this.prevPrice = candle.vwp;
      if (priceDirection == 'up') {
        console.log('\x1b[32m%s\x1b[0m', 'price change up ' + priceChangePercent);
        this.currentTrend = 'long';
      } else {
        console.log('\x1b[31m%s\x1b[0m', 'price change down ' + priceChangePercent);
        this.currentTrend = 'short';
      }
      this.toUpdate = true;
    }
  }
}

// For debugging purposes.
strat.log = function() {
  log.debug('debug log..');
}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function() {

  // Only continue if we have a new update.
  if(!this.toUpdate)
    return;

  if(this.currentTrend === 'long') {
    
    console.log(this.currentTrend);
    // If it was long, set it to short
    // this.currentTrend = 'short';
    // this.advice('short');

  } else {
    
    console.log(this.currentTrend);
    // If it was short, set it to long
    // this.currentTrend = 'long';
    // this.advice('long');

  }
}

module.exports = strat;
