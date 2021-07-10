// The candleManager consumes trades and emits:
// - `candles`: array of minutly candles.
// - `candle`: the most recent candle after a fetch Gekko.

var _ = require('lodash');
var moment = require('moment');
var fs = require('fs');

var util = require(__dirname + '/../util');
var dirs = util.dirs();
var config = util.getConfig();
var log = require(dirs.core + 'log');

var CandleCreator = require(dirs.budfox + 'candleCreator');

var Manager = function() {
  _.bindAll(this);

  this.candleCreator = new CandleCreator;

  this.candleCreator
    .on('candles', this.relayCandles);
};

util.makeEventEmitter(Manager);
Manager.prototype.processTrades = function(tradeBatch) {
  //console.log('core/budfox/candleManager.js processTrades:');
  this.candleCreator.write(tradeBatch);
}

Manager.prototype.relayCandles = function(candles) {
  //console.log('core/budfox/candleManager.js relayCandles:');
  this.emit('candles', candles);
}

module.exports = Manager;
