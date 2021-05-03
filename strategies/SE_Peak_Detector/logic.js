var tool = require('./detector.js');
var logic = {};
logic.init = function(settings) {
  this.singleOrder = undefined;
  this.minProfitChecked = false;
  this.prevPriceDir;

  this.detectedFallingPeak;
  this.detectedRisingPeak;
  this.detectedPrevFallingPeak;
  this.detectedPrevRisingPeak;
   
  this.lastDetectedPrice = 0;
  this.priceDiffCapacitor = 0;
  this.fallDetected = false;
  this.peakDetected = false;
  this.fall2Detected = false;
  this.peak2Detected = false;
  this.entryPointDetected = false;
  this.exitPointDetected = false;
  this.orderIdCounter = 0;

  this.currencyPortfolioInitial = 101;
  this.currencyPortfolioTrading = this.currencyPortfolioInitial;
  this.currencyTradingAmountPercent = settings.trading_amount_percent;
  this.priceFallPercent = settings.price_fall; 
  this.minPercentOfProfit = settings.min_percent_of_profit;  
  tool.init();
}

logic.detectExitPoint = function(candle) {
  let priceGrow = tool.getPriceDiffPercent(this.singleOrder.price, candle.close);
  if (!this.minProfitChecked) {
    if (priceGrow >= this.minPercentOfProfit) {
      this.minProfitChecked = true;
      console.log(priceGrow + '% of Minimum profit can be taken.');
    } else if (priceGrow < 0) {
      if (priceGrow > -2) {
        console.log(priceGrow + '% of losses detected. advice - just WAIT. need solution here!');
      } 
      if (priceGrow < -4) {
        return true;
      }
    }
  } else {
    if (candle.close < candle.open) {
      if (candle.close < tool.getCandleBufferLast().close) {
        if (tool.getCandleBufferLast().close > tool.getCandleBufferLast().open) {
          this.exitPointDetected = true;
          console.log('Exit point detected');
          return true;
        }
      }
    }
  }
  return false;
}

logic.detectEntryPoint = function(candle) {
  // PHASE 1: 
  // detect fall and lower peak
  if (!this.fallDetected) {
    let res = tool.detectFall(candle);
    if (res.detected) {
      this.detectedFallingPeak = res.fallingPeak;
      this.detectedRisingPeak = res.fallingBody.risingPeak;
      this.detectedPrevFallingPeak = res.prevFallingPeak;
      console.log('falling peak and rising peak detected!');
      this.fallDetected = true;
      tool.addCandleMarker(candle, {
        position: 'belowBar',
        color: '#cc4040',
        shape: 'arrowUp',
        text: 'e.p.'
      });
      
      this.addChartHistogram({ 
        time: this.detectedFallingPeak.peakTime.unix(), 
        value: (this.detectedFallingPeak.peakPrice), 
        color: '#333333'
      });
      this.addChartHistogram({ 
        time: this.detectedRisingPeak.peakTime.unix(), 
        value: (this.detectedRisingPeak.peakPrice), 
        color: '#888888'
      });
      this.addChartHistogram({ 
        time: this.detectedPrevFallingPeak.peakTime.unix(), 
        value: (this.detectedPrevFallingPeak.peakPrice), 
        color: '#bbbbbb'
      });
      if (this.detectedFallingPeak.peakPrice > this.detectedPrevFallingPeak.peakPrice) {
        console.log('trend goes up');
      } else {
        console.log('trend goes down');
      }
    }
  }
  // PHASE TWO
  if (this.fallDetected) {
    if (tool.detectRise(candle)) {
      this.fallDetected = false;
    }
  }
  return false;
}

logic.analyseAndMakeDecision = function(candle) {
  var advice = undefined;
  if (!this.buyOrderCreated()) {
    // PHASE ONE - detect entry point
    // when we going to buy
    if (!this.entryPointDetected) {
      let result = this.detectEntryPoint(candle);
      if (result) {
        advice = this.createAdviceToBuyAmountOfAssetForOneGridStep(candle.close);
        console.log('\x1b[32m%s\x1b[0m', 'BUY advice');
      }  
    }   
  } else {
    // PHASE TWO - detect exit point
    // find the best moment to sell
    if (this.entryPointDetected && !this.exitPointDetected) {
      let result = this.detectExitPoint(candle);
      if (result) {
        advice = this.createAdviceToSellOpenedAsset();
        console.log('\x1b[31m%s\x1b[0m', 'SELL advice');
      }
    }
  }
  return advice;
}

logic.buyOrderCreated = function() {
  if (this.singleOrder) {
    if (this.singleOrder.status == 'opening' || this.singleOrder.status == 'opened') {
      return true;
    }
  }
  return false;
}

logic.getAssetAmountForTrading = function(assetPrice) {
  let currencyTradingAmount = this.currencyPortfolioTrading / 100 * this.currencyTradingAmountPercent;
  return currencyTradingAmount / assetPrice;
}

logic.doWeHaveEnoughCurrency = function() {
  if (this.currencyPortfolioTrading > 1) {
    return true;
  }
  return false;
}

logic.createAdviceToBuyAmountOfAssetForOneGridStep = function(price) {
  let advice = {};
  if (this.doWeHaveEnoughCurrency()) {
    console.log('advice going to BUY created');
    this.singleOrder = {};
    this.singleOrder.id = this.generateOrderId();
    this.singleOrder.status = 'opening';
    this.singleOrder.assetAmount = this.getAssetAmountForTrading(price);
    this.singleOrder.price = price;
    advice.assetAmount = this.getAssetAmountForTrading(price);
    advice.direction = 'long';
    advice.gridOrderId = this.singleOrder.id;
    return advice;
  }
  console.log('we Dont have enough Currency');
  return false;
}

logic.createAdviceToSellOpenedAsset = function() {
  let advice = {};
  console.log('create advice to SELLL');
  advice.assetAmount = this.singleOrder.assetAmount;
  advice.direction = 'short';
  advice.gridOrderId = this.singleOrder.id;
  this.singleOrder.status = 'closing';
  return advice;
}

logic.generateOrderId = function() {
  this.orderIdCounter++;
  return 'grid-' + Date.now() + '-' + this.orderIdCounter;
}

logic.getCandleBufferLength = function() {
  return tool.candleBuffer.length;
}

logic.addToCandleBuffer = function(candle) {
  tool.addToCandleBuffer(candle);
}

module.exports = logic;