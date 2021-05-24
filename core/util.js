var moment = require('moment');
var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var semver = require('semver');
var program = require('commander');

var startTime = moment();

var _config = false;
var _package = false;
var _nodeVersion = false;
var _gekkoMode = false;
var _gekkoEnv = false;

var _args = false;

// helper functions
var util = {
  getConfig: function() {
    // cache
    if(_config)
      return _config;

    if(!program.config)
        util.die('Please specify a config file.', true);

    if(!fs.existsSync(util.dirs().gekko + program.config))
      util.die('Cannot find the specified config file.', true);

    _config = require(util.dirs().gekko + program.config);
    return _config;
  },
  // overwrite the whole config
  setConfig: function(config) {
    _config = config;
  },
  setConfigProperty: function(parent, key, value) {
    if(parent)
      _config[parent][key] = value;
    else
      _config[key] = value;
  },
  getVersion: function() {
    return util.getPackage().version;
  },
  getPackage: function() {
    if(_package)
      return _package;


    _package = JSON.parse( fs.readFileSync(__dirname + '/../package.json', 'utf8') );
    return _package;
  },
  getRequiredNodeVersion: function() {
    return util.getPackage().engines.node;
  },
  recentNode: function() {
    var required = util.getRequiredNodeVersion();
    return semver.satisfies(process.version, required);
  },
  // check if two moments are corresponding
  // to the same time
  equals: function(a, b) {
    return !(a < b || a > b)
  },
  minToMs: function(min) {
    return min * 60 * 1000;
  },
  defer: function(fn) {
    return function(args) {
      var args = _.toArray(arguments);
      return _.defer(function() { fn.apply(this, args) });
    }
  },
  logVersion: function() {
    return  `Gekko version: v${util.getVersion()}`
    + `\nNodejs version: ${process.version}`;
  },
  die: function(m, soft) {

    if(_gekkoEnv === 'child-process') {
      return process.send({type: 'error', error: '\n ERROR: ' + m + '\n'});
    }

    var log = console.log.bind(console);

    if(m) {
      if(soft) {
        log('\n ERROR: ' + m + '\n\n');
      } else {
        log(`\nGekko encountered an error and can\'t continue`);
        log('\nError:\n');
        log(m, '\n\n');
        log('\nMeta debug info:\n');
        log(util.logVersion());
        log('');
      }
    }
    process.exit(1);
  },
  dirs: function() {
    var ROOT = __dirname + '/../';

    return {
      root: ROOT,
      gekko: ROOT,
      core: ROOT + 'core/',
      markets: ROOT + 'core/markets/',
      exchanges: ROOT + 'exchange/wrappers/',
      plugins: ROOT + 'plugins/',
      methods: ROOT + 'strategies/',
      indicators: ROOT + 'strategies/indicators/',
      budfox: ROOT + 'core/budfox/',
      importers: ROOT + 'importers/exchanges/',
      tools: ROOT + 'core/tools/',
      workers: ROOT + 'core/workers/',
      web: ROOT + 'web/',
      config: ROOT + 'config/',
      broker: ROOT + 'exchange/',
      grids: ROOT + 'pipeline/grids/',
      spotOrders: ROOT + 'pipeline/orders/',
      pipelineControl: ROOT + 'pipeline/'
    }
  },
  getMarketPairId: function(config) {
    let pairid =
    config.exchange + '-' + 
    config.asset + '-' + 
    config.currency;
    return pairid; 
  },
  saveSpotJsonFile: function(spot, config) {
    let fileName = util.getMarketPairId(config) + '-spot.json';
    let result = util.saveJsonFile(fileName, util.dirs().pipelineControl, spot);
    return result;
  },
  loadSpotJsonFile: function(config) {
    let fileName = util.getMarketPairId(config) + '-spot.json';
    let spot = util.loadJsonFile(fileName, util.dirs().pipelineControl);
    return spot;
  },
  
  saveSpotOrdersJsonFile: function(orders, config) {
    let fileName = util.getMarketPairId(config) + '-orders.json';
    let result = util.saveJsonFile(fileName, util.dirs().spotOrders, orders);
    return result;
  },
  loadSpotOrdersJsonFile: function(config) {
    let fileName = util.getMarketPairId(config) + '-orders.json';
    let ordersFileData = util.loadJsonFile(fileName, util.dirs().spotOrders);
    return ordersFileData;
  },

  saveExchangeBalanceJsonFile: function(balance, exchange) {
    //console.log('saveExchangeBalanceJsonFile config ', config);
    let fileName = exchange + '-balance.json';
    let result = util.saveJsonFile(fileName, util.dirs().pipelineControl, balance);
    return result;
  },
  loadExchangeBalanceJsonFile: function(exchange) {
    //console.log('saveExchangeBalanceJsonFile config ', config);
    let fileName = exchange + '-balance.json';
    let balance = util.loadJsonFile(fileName, util.dirs().pipelineControl);
    return balance;
  },

  savePipelineControlJsonFile: function(pipeline, config) {
    let fileName = util.getMarketPairId(config) + '-pipeline-control.json';
    let result = util.saveJsonFile(fileName, util.dirs().pipelineControl, pipeline);
    return result;
  },
  loadPipelineControlJsonFile: function(config) {
    let fileName = util.getMarketPairId(config) + '-pipeline-control.json';
    let pipeline = util.loadJsonFile(fileName, util.dirs().pipelineControl);
    return pipeline;
  },
  saveGridJsonFile: function(grid, config) {
    let fileName = util.getMarketPairId(config) + '-grid.json';
    let result = util.saveJsonFile(fileName, util.dirs().grids, grid);
    return result;
  },
  loadGridJsonFile: function(config) {
    let fileName = util.getMarketPairId(config) + '-grid.json';
    let gridFileData = util.loadJsonFile(fileName, util.dirs().grids);
    if (gridFileData) {
      if (gridFileData.priceLevels && gridFileData.priceLevels.length) {
        return gridFileData;
      }
      console.log('grid data file exist but empty.');
    }
    let grid = {};
    grid.createdAt = moment().format('YYYY-MM-DD HH:mm');
    grid.initialPrice = 0;
    grid.numberOfLevels = 0;
    grid.priceStepPcnt = 0;
    grid.priceHiLimitPcnt = 0;
    grid.priceLowLimitPcnt = 0;
    grid.tradingAmountPcnt = 0;
    grid.tradingStartTime = moment().unix();
    grid.tradingStartTimeReadable = moment().format('YYYY-MM-DD HH:mm');
    grid.priceLevels = [];
    console.log('unable to find grid data file. empty grid initialized.');
    util.saveJsonFile(fileName, util.dirs().grids, grid);
    return grid;
  },
  
  
  saveJsonFile: function(fileName, dir, data) {
    let fullPath = dir + fileName;
    let result;
    fs.writeFile(fullPath, JSON.stringify(data, 0, 4), function (err) {
      if(err) {
        console.log('unable to write JSON file: ', err);
        result = false;
      } else {
        console.log('written JSON file to: ', fullPath);
        result = fullPath;
      }
    });
    return result;
  },
  loadJsonFile: function(fileName, dir) {
    let fullPath = dir + fileName;
    let data = undefined;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (e) {
      data = {};
    }
    return data;
  },
  
  inherit: function(dest, source) {
    require('util').inherits(
      dest,
      source
    );
  },
  makeEventEmitter: function(dest) {
    util.inherit(dest, require('events').EventEmitter);
  },
  setGekkoMode: function(mode) {
    _gekkoMode = mode;
  },
  gekkoMode: function() {
    if(_gekkoMode)
      return _gekkoMode;

    if(program['import'])
      return 'importer';
    else if(program.backtest)
      return 'backtest';
    else
      return 'realtime';
  },
  gekkoModes: function() {
    return [
      'importer',
      'backtest',
      'realtime'
    ]
  },
  setGekkoEnv: function(env) {
    _gekkoEnv = env;
  },
  gekkoEnv: function() {
    return _gekkoEnv || 'standalone';
  },
  launchUI: function() {
    if(program['ui'])
      return true;
    else
      return false;
  },
  getStartTime: function() {
    return startTime;
  },
}

// NOTE: those options are only used
// in stand alone mode
program
  .version(util.logVersion())
  .option('-c, --config <file>', 'Config file')
  .option('-b, --backtest', 'backtesting mode')
  .option('-i, --import', 'importer mode')
  .option('--ui', 'launch a web UI')
  .parse(process.argv);

// make sure the current node version is recent enough
if(!util.recentNode())
  util.die([
    'Your local version of Node.js is too old. ',
    'You have ',
    process.version,
    ' and you need atleast ',
    util.getRequiredNodeVersion()
  ].join(''), true);

module.exports = util;
