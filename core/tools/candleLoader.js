// TODO: properly handle a daterange for which no data is available.

const batchSize = 1000;

const _ = require('lodash');
const fs = require('fs');
const moment = require('moment');

const util = require('../../core/util');
const config = util.getConfig();
const dirs = util.dirs();
const log = require(dirs.core + '/log');

const adapter = config[config.adapter];
const Reader = require(dirs.gekko + adapter.path + '/reader');
const daterange = config.daterange;

const CandleBatcher = require(dirs.core + 'candleBatcher');

const to = moment.utc(daterange.to).startOf('minute');
const from = moment.utc(daterange.from).startOf('minute');
const toUnix = to.unix();

if(to <= from)
  util.die('This daterange does not make sense.')

if(!from.isValid())
  util.die('invalid `from`');

if(!to.isValid())
  util.die('invalid `to`');

let iterator = {
  from: from.clone(),
  to: from.clone().add(batchSize, 'm').subtract(1, 's')
}

var DONE = false;

var result = [];
var reader = new Reader();
var batcher;
var next;
var doneFn = () => {
  process.nextTick(() => {
    //console.log('core/tools/candleLoader.js > candleLoader process.nextTick ', result.length);
    next(result);
  })
};

module.exports = function(candleSize, _next) {
  next = _.once(_next);
  //console.log('core/tools/candleLoader.js > new CandleBatcher(candleSize)');
  batcher = new CandleBatcher(candleSize)
    .on('candle', handleBatchedCandles);

  getBatch();
}

const getBatch = () => {
  reader.get(
    iterator.from.unix(),
    iterator.to.unix(),
    'full',
    handleCandles
  )
}

const shiftIterator = () => {
  iterator = {
    from: iterator.from.clone().add(batchSize, 'm'),
    to: iterator.from.clone().add(batchSize * 2, 'm').subtract(1, 's')
  }
}

const handleCandles = (err, data) => {
  if(err) {
    console.error(err);
    util.die('Encountered an error..')
  }

  if(_.size(data) && _.last(data).start >= toUnix || iterator.from.unix() >= toUnix) {
    DONE = true;
  }
  //console.log('core/tools/candleLoader.js > candle loader.. handleCandles');
  //console.log(data);
  batcher.write(data);
  batcher.flush();

  if(DONE) {
    reader.close();
    setTimeout(doneFn, 100);
  } else {
    shiftIterator();
    getBatch();
  }
}

const handleBatchedCandles = candle => {
  //console.log('core/tools/candleLoader.js > result.push(candle)');
  result.push(candle);
  //console.log(result);
}
