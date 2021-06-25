var log = require('../core/log');
var moment = require('moment');
var _ = require('lodash');
var Server = require('../web/server.js');

var Actor = function(next) {
  _.bindAll(this);
  console.log('server instance...');
  this.server = new Server();
  this.server.setup(next);
}

Actor.prototype.init = function(data) {
  console.log('server init');
  this.server.broadcastHistory(data);
};

Actor.prototype.processCandle = function(candle, next) {
  this.server.broadcastCandle(candle);
  console.log('server processCandle');
  next();
};

Actor.prototype.processAdvice = function(advice) {
  this.server.broadcastAdvice(advice);
};

module.exports = Actor;