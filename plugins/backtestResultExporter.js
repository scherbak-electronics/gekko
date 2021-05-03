// Small plugin that subscribes to some events, stores
// them and sends it to the parent process.

const log = require('../core/log');
const _ = require('lodash');
const util = require('../core/util.js');
const env = util.gekkoEnv();
const config = util.getConfig();
const moment = require('moment');
const fs = require('fs');

const BacktestResultExporter = function() {
  this.performanceReport;
  this.roundtrips = [];
  this.stratUpdates = [];
  this.stratCandles = [];
  this.trades = [];
  this.markers = [];
  this.lines = [];
  this.histogram = [];
  this.area = [];
  this.priceLines = [];
  this.statistics = [];


  this.candleProps = config.backtestResultExporter.data.stratCandleProps;

  if(!config.backtestResultExporter.data.stratUpdates)
    this.processStratUpdate = null;

  if(!config.backtestResultExporter.data.roundtrips)
    this.processRoundtrip = null;

  if(!config.backtestResultExporter.data.stratCandles)
    this.processStratCandles = null;

  if(!config.backtestResultExporter.data.portfolioValues)
    this.processPortfolioValueChange = null;

  if(!config.backtestResultExporter.data.trades)
    this.processTradeCompleted = null;

  _.bindAll(this);
}

BacktestResultExporter.prototype.processPortfolioValueChange = function(portfolio) {
  this.portfolioValue = portfolio.balance;
}

BacktestResultExporter.prototype.processStratCandle = function(candle) {
  let strippedCandle;
  //console.log('BacktestResultExporter.prototype.processStratCandle');
  if(true || !this.candleProps) {
    strippedCandle = {
      ...candle,
      start: candle.start.unix(),
      date: candle.start.unix(),
    }
  } else {
    strippedCandle = {
      ..._.pick(candle, this.candleProps),
      start: candle.start.unix()
    }
  }
  if(config.backtestResultExporter.data.portfolioValues) {
    strippedCandle.portfolioValue = this.portfolioValue;
  }
  this.stratCandles.push(strippedCandle);
  if (candle.markers) {
    if (!this.markers.length) {
      this.markers = candle.markers;
    } else {
      this.markers = this.markers.concat(candle.markers);
    }
  }
};

BacktestResultExporter.prototype.processCandleMarker = function(marker) {
  console.log('processCandleMarker ' + marker);
  console.log(marker);
  this.markers.push(marker);
}

BacktestResultExporter.prototype.processChartLine = function(line) {
  console.log('processChartLine');
  console.log(line);
  this.lines.push(line);
}

BacktestResultExporter.prototype.processChartPriceLine = function(line) {
  console.log('processChartPriceLine');
  console.log(line);
  this.priceLines.push(line);
}

BacktestResultExporter.prototype.processChartHistogram = function(histogram) {
  console.log('processChartHistogram');
  console.log(histogram);
  this.histogram.push(histogram);
}

BacktestResultExporter.prototype.processChartArea = function(area) {
  console.log('processChartArea');
  console.log(area);
  this.area.push(area);
}

BacktestResultExporter.prototype.processChartStatistics = function(statistics) {
  console.log('processChartStatistics');
  console.log(statistics);
  this.statistics.push(statistics);
}

BacktestResultExporter.prototype.processRoundtrip = function(roundtrip) {
  this.roundtrips.push({
    ...roundtrip,
    entryAt: roundtrip.entryAt.unix(),
    exitAt: roundtrip.exitAt.unix()
  });
};

BacktestResultExporter.prototype.processTradeCompleted = function(trade) {
  this.trades.push({
    ...trade,
    date: trade.date.unix()
  });
};

BacktestResultExporter.prototype.processStratUpdate = function(stratUpdate) {
  this.stratUpdates.push({
    ...stratUpdate,
    date: stratUpdate.date.unix()
  });
}

BacktestResultExporter.prototype.processPerformanceReport = function(performanceReport) {
  this.performanceReport = performanceReport;
}

BacktestResultExporter.prototype.finalize = function(done) {
  const backtest = {
    market: config.watch,
    tradingAdvisor: config.tradingAdvisor,
    strategyParameters: config[config.tradingAdvisor.method],
    performanceReport: this.performanceReport
  };

  if(config.backtestResultExporter.data.stratUpdates)
    backtest.stratUpdates = this.stratUpdates;

  if(config.backtestResultExporter.data.roundtrips)
    backtest.roundtrips = this.roundtrips;

  if(config.backtestResultExporter.data.stratCandles)
    backtest.stratCandles = this.stratCandles;

  if(config.backtestResultExporter.data.trades) {
    backtest.trades = this.trades;
  }
  if (this.markers && this.markers.length) {
    backtest.markers = this.markers;
  }
  if (this.lines && this.lines.length) {
    backtest.lines = this.lines;
  }  
  if (this.histogram && this.histogram.length) {
    backtest.histogram = this.histogram;
  }
  if (this.area && this.area.length) {
    backtest.area = this.area;
  }
  if (this.priceLines && this.priceLines.length) {
    backtest.priceLines = this.priceLines;
  }
  if (this.statistics && this.statistics.length) {
    backtest.statistics = this.statistics;
  }
  if(env === 'child-process') {
    process.send({backtest});
  }

  if(config.backtestResultExporter.writeToDisk) {
    this.writeToDisk(backtest, done);
  } else {
    done();
  }
};

BacktestResultExporter.prototype.writeToDisk = function(backtest, next) {
  let filename;

  if(config.backtestResultExporter.filename) {
    filename = config.backtestResultExporter.filename;
  } else {
    const now = moment().format('YYYY-MM-DD_HH-mm-ss');
    filename = `backtest-${config.tradingAdvisor.method}-${now}.json`;
  }

  fs.writeFile(
    util.dirs().gekko + filename,
    JSON.stringify(backtest),
    err => {
      if(err) {
        log.error('unable to write backtest result', err);
      } else {
        log.info('written backtest to: ', util.dirs().gekko + filename);
      }

      next();
    }
  );
}

module.exports = BacktestResultExporter;
