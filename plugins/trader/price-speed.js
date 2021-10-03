/**
 * SECO 
 * (how banking system works)
 *  
 * Price Speed Measurements
 * measures the rate of price change over a given period of time
 */
 const _ = require('lodash');
 const util = require('../../core/util');
 const moment = require('moment');
 var colors = require('colors');
 const LogProxyClass = require('../../core/log-proxy');
 const BaseModule = require('../../core/seco/base-module');
 
 class PriceSpeed extends BaseModule {
  constructor(config) {
    super(config);
    this.config = config;
    this.files = [
      {
        name: 'price-speed.json',
        path: this.pairPath,
        createIfNotExist: true,
        propNames: [
          'lastMeasuredAskPrice',
          'lastMeasuredBidPrice',
          'askPriceChangeUpSpeed',
          'askPriceChangeDownSpeed',
          'bidPriceChangeUpSpeed',
          'bidPriceChangeDownSpeed',
          'priceSpeedLog',
          'priceSpeedLogMaxLen'
        ]
      }
    ];
    this.console = new LogProxyClass(config, 'Trader Logic');
    this.lastMeasuredAskPrice = 0;
    this.lastMeasuredBidPrice = 0;
    this.askPriceChangeUpSpeed = 0;
    this.askPriceChangeDownSpeed = 0;
    this.bidPriceChangeUpSpeed = 0;
    this.bidPriceChangeDownSpeed = 0;
    this.priceSpeedLog = [];
    this.priceSpeedLogMaxLen = 10;
    this.createNewFilesIfNotExist();
    this.readData();
  }

  measuringProcess(askPrice, bidPrice) {
    let askPriceDiffPcnt = 0;
    let bidPriceDiffPcnt = 0;
    if (this.lastMeasuredAskPrice != askPrice) {
      askPriceDiffPcnt = util.getHowBiggerInPcnt(askPrice, this.lastMeasuredAskPrice);
      if (askPriceDiffPcnt > 0) {
        this.askPriceChangeUpSpeed = askPriceDiffPcnt;
      } else {
        this.askPriceChangeDownSpeed = askPriceDiffPcnt;
      }
      this.lastMeasuredAskPrice = askPrice;
    }
    if (this.lastMeasuredBidPrice != bidPrice) {
      bidPriceDiffPcnt = util.getHowBiggerInPcnt(bidPrice, this.lastMeasuredBidPrice);
      if (bidPriceDiffPcnt > 0) {
        this.bidPriceChangeUpSpeed = bidPriceDiffPcnt;
      } else {
        this.bidPriceChangeDownSpeed = bidPriceDiffPcnt;
      }
      this.lastMeasuredBidPrice = bidPrice;
    }
  }

  logPriceSpeed(askPriceSpeed, bidPriceSpeed) {

  }

  updateLastMeasuredPrices(askPrice, bidPrice) {
    this.lastMeasuredAskPrice = askPrice;
    this.lastMeasuredBidPrice = bidPrice;
  }
}

module.exports = PriceSpeed;