const _ = require('lodash');

const util = require('../../core/util');
const ENV = util.gekkoEnv();

const config = util.getConfig();
const calcConfig = config.paperTrader;
const watchConfig = config.watch;
const dirs = util.dirs();
const log = require(dirs.core + 'log');
const avgVol = 1;

const TrailingStop = require(dirs.broker + 'triggers/trailingStop');

const PaperTrader = function() {
  _.bindAll(this);

  if(calcConfig.feeUsing === 'maker') {
    this.rawFee = calcConfig.feeMaker;
  } else {
    this.rawFee = calcConfig.feeTaker;
  }

  this.fee = 1 - this.rawFee / 100;

  this.currency = watchConfig.currency;
  this.asset = watchConfig.asset;

  this.portfolio = {
    asset: calcConfig.simulationBalance.asset,
    currency: calcConfig.simulationBalance.currency,
  }

  this.balance = false;

  if(this.portfolio.asset > 0) {
    this.exposed = true;
  }

  this.propogatedTrades = 0;
  this.propogatedTriggers = 0;

  this.warmupCompleted = false;

  this.warmupCandle;

  this.previousAdvice;
  this.waitForVolume = false;
}

PaperTrader.prototype.relayPortfolioChange = function() {
  this.deferredEmit('portfolioChange', {
    asset: this.portfolio.asset,
    currency: this.portfolio.currency
  });
}

PaperTrader.prototype.relayPortfolioValueChange = function() {
  this.deferredEmit('portfolioValueChange', {
    balance: this.getBalance()
  });
}

PaperTrader.prototype.extractFee = function(amount) {
  amount *= 1e8;
  amount *= this.fee;
  amount = Math.floor(amount);
  amount /= 1e8;
  return amount;
}

PaperTrader.prototype.setStartBalance = function() {
  this.balance = this.getBalance();
}

// after every succesfull trend ride we hopefully end up
// with more BTC than we started with, this function
// calculates Gekko's profit in %.
PaperTrader.prototype.updatePosition = function(what) {

  let cost;
  let amount;

  // virtually trade all {currency} to {asset}
  // at the current price (minus fees)
  if(what === 'long') {
    cost = (1 - this.fee) * this.portfolio.currency;
    // if (this.candle.volume < avgVol) {
    //   this.portfolio.asset += this.extractFee(this.portfolio.currency / this.candle.high);
    // } else {
    //   this.portfolio.asset += this.extractFee(this.portfolio.currency / this.price);
    // }
    this.portfolio.asset += this.extractFee(this.portfolio.currency / this.price);

    amount = this.portfolio.asset;
    this.portfolio.currency = 0;

    this.exposed = true;
    this.trades++;
  }

  // virtually trade all {currency} to {asset}
  // at the current price (minus fees)
  else if(what === 'short') {
    cost = (1 - this.fee) * (this.portfolio.asset * this.price);
    // if (this.candle.volume < avgVol) {
    //   this.portfolio.currency += this.extractFee(this.portfolio.asset * this.candle.low);
    //   amount = this.portfolio.currency / this.candle.low;
    // }
    // else {
    //   this.portfolio.currency += this.extractFee(this.portfolio.asset * this.price);
    //   amount = this.portfolio.currency / this.price;
    // }

    this.portfolio.currency += this.extractFee(this.portfolio.asset * this.price);
    amount = this.portfolio.currency / this.price;

    this.portfolio.asset = 0;

    this.exposed = false;
    this.trades++;
  }

  const effectivePrice = this.price * this.fee;

  return { cost, amount, effectivePrice };
}

PaperTrader.prototype.getBalance = function() {
  return this.portfolio.currency + this.price * this.portfolio.asset;
}

PaperTrader.prototype.now = function() {
  return this.candle.start.clone().add(1, 'minute');
}

PaperTrader.prototype.processAdvice = function(advice) {
// Do not process advice and clear previous advice as they cancel out each other
if (this.waitForVolume && advice.recommendation != this.previousAdvice.recommendation) {
  this.waitForVolume = false;
  this.previousAdvice = undefined;
  return log.warn('[Papertrader] Cancel trade as previous unexecuted trade would negate each other');
}


// Set flags to delay trade until candle with enough volume
if (this.candle.volume < avgVol && !this.waitForVolume) {
  this.previousAdvice = advice;
  this.waitForVolume = true;
  return log.info('[Papertrader] Not enough volume to process trade, will wait til next candle');
}

  let action;
  if(advice.recommendation === 'short') {
    action = 'sell';

    // clean up potential old stop trigger
    if(this.activeStopTrigger) {
      this.deferredEmit('triggerAborted', {
        id: this.activeStopTrigger.id,
        date: advice.date
      });

      delete this.activeStopTrigger;
    }

  } else if(advice.recommendation === 'long') {
    action = 'buy';

    if(advice.trigger) {

      // clean up potential old stop trigger
      if(this.activeStopTrigger) {
        this.deferredEmit('triggerAborted', {
          id: this.activeStopTrigger.id,
          date: advice.date
        });

        delete this.activeStopTrigger;
      }

      this.createTrigger(advice);
    }
  } else {
    return log.warn(
      `[Papertrader] ignoring unknown advice recommendation: ${advice.recommendation}`
    );
  }

  this.tradeId = 'trade-' + (++this.propogatedTrades);

  this.deferredEmit('tradeInitiated', {
    id: this.tradeId,
    adviceId: advice.id,
    action,
    portfolio: _.clone(this.portfolio),
    balance: this.getBalance(),
    date: advice.date,
  });

  const { cost, amount, effectivePrice } = this.updatePosition(advice.recommendation);

  this.relayPortfolioChange();
  this.relayPortfolioValueChange();

  this.deferredEmit('tradeCompleted', {
    id: this.tradeId,
    adviceId: advice.id,
    action,
    cost,
    amount,
    price: this.price,
    portfolio: this.portfolio,
    balance: this.getBalance(),
    date: advice.date,
    effectivePrice,
    feePercent: this.rawFee
  });
}

PaperTrader.prototype.createTrigger = function(advice) {
  const trigger = advice.trigger;

  if(trigger && trigger.type === 'trailingStop') {

    if(!trigger.trailValue) {
      return log.warn(`[Papertrader] ignoring trailing stop without trail value`);
    }

    const triggerId = 'trigger-' + (++this.propogatedTriggers);

    this.deferredEmit('triggerCreated', {
      id: triggerId,
      at: advice.date,
      type: 'trailingStop',
      proprties: {
        trail: trigger.trailValue,
        initialPrice: this.price,
      }
    });

    this.activeStopTrigger = {
      id: triggerId,
      adviceId: advice.id,
      instance: new TrailingStop({
        initialPrice: this.price,
        trail: trigger.trailValue,
        onTrigger: this.onStopTrigger
      })
    }
  } else {
    log.warn(`[Papertrader] Gekko does not know trigger with type "${trigger.type}".. Ignoring stop.`);
  }
}

PaperTrader.prototype.onStopTrigger = function() {

  const date = this.now();

  this.deferredEmit('triggerFired', {
    id: this.activeStopTrigger.id,
    date
  });

  const { cost, amount, effectivePrice } = this.updatePosition('short');

  this.relayPortfolioChange();
  this.relayPortfolioValueChange();

  this.deferredEmit('tradeCompleted', {
    id: this.tradeId,
    adviceId: this.activeStopTrigger.adviceId,
    action: 'sell',
    cost,
    amount,
    price: this.price,
    portfolio: this.portfolio,
    balance: this.getBalance(),
    date,
    effectivePrice,
    feePercent: this.rawFee
  });

  delete this.activeStopTrigger;
}

PaperTrader.prototype.processStratWarmupCompleted = function() {
  this.warmupCompleted = true;
  this.processCandle(this.warmupCandle, _.noop);
}

PaperTrader.prototype.processCandle = function(candle, done) {
  if(!this.warmupCompleted) {
    this.warmupCandle = candle;
    return done();
  }

  this.price = candle.close;
  this.candle = candle;

  if(!this.balance) {
    this.setStartBalance();
    this.relayPortfolioChange();
    this.relayPortfolioValueChange();
  }

  if(this.exposed) {
    this.relayPortfolioValueChange();
  }

  if(this.activeStopTrigger) {
    this.activeStopTrigger.instance.updatePrice(this.price);
  }

  if (this.waitForVolume){
    log.debug('Candle Volume =', candle.volume);
  }

  if (candle.volume > avgVol && this.waitForVolume) {
    this.processAdvice(this.previousAdvice);
    this.waitForVolume = false;
    this.previousAdvice = undefined;
  }

  done();
}

module.exports = PaperTrader;
