// The heart schedules and emit ticks every 20 seconds.

var util = require(__dirname + '/../util');
var log = require(util.dirs().core + 'log');

var _ = require('lodash');
var moment = require('moment');

if (util.getConfig().watch.tickrate)
  var TICKRATE = util.getConfig().watch.tickrate;
else if(util.getConfig().watch.exchange === 'okcoin')
  var TICKRATE = 2;
else
  var TICKRATE = 20;

var Heart = function() {
  this.lastTick = false;

  _.bindAll(this);
}

util.makeEventEmitter(Heart);

Heart.prototype.pump = function() {
  log.debug('scheduling ticks');
  this.scheduleTicks();
}

Heart.prototype.tick = function() {
  if(this.lastTick) {
    var CandleSize = 1;
    if (util.getConfig().candleSize) { 
      CandleSize = util.getConfig().candleSize;
    }
    // make sure the last tick happened within the last candle
    // @link #514
    // make sure the last tick happened not to lang ago
    // @link https://github.com/askmike/gekko/issues/514
    if(this.lastTick < moment().unix() - TICKRATE * 3) {
      log.debug('tick in time, see #514 for details.');
    }
    if(this.lastTick < moment().unix() - CandleSize * 60) {
      util.die('Failed to tick in time, see https://github.com/askmike/gekko/issues/514 for details', true);
    }
  }

  this.lastTick = moment().unix();
  this.emit('tick');
}

Heart.prototype.scheduleTicks = function() {
  setInterval(
    this.tick,
    +moment.duration(TICKRATE, 's')
  );

  // start!
  _.defer(this.tick);
}

module.exports = Heart;
