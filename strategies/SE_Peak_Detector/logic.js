var tool = require('./candle_tools.js');
var logic = {};
logic.init = function(settings) {
  this.singleOrder = undefined;
  this.minProfitChecked = false;
  this.prevPriceDir;
   
  this.lastDetectedPrice = 0;
  this.priceDiffCapacitor = 0;
  this.priceFallDetected = false;
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
  // PHASE ONE
  if (!this.priceFallDetected) {
    let priceDiff = tool.getPriceDiffPercent(this.lastDetectedPrice, candle.close); 
    candle.priceDiff = priceDiff;
    this.lastDetectedPrice = candle.close;
    let priceDir;
    if (priceDiff < 0) {
      priceDiff = -priceDiff;
      priceDir = 'fall';
      this.priceDiffCapacitor += priceDiff;
    } else {
      priceDir = 'rise';
      this.priceDiffCapacitor -= priceDiff;
    }
    if (this.prevPriceDir != priceDir) {
      this.prevPriceDir = priceDir;
      //console.log('price direction ' + priceDir);
      
    }
    /*
    let type = tool.getCandleType(candle);
    if (type == 'rising_big') {
      tool.addCandleMarker(candle, {
        position: 'aboveBar',
        color: '#55aa55',
        shape: 'arrowDown',
        text: 'rise big'
      });
    }
    if (type == 'falling_big') {
      tool.addCandleMarker(candle, {
        position: 'aboveBar',
        color: '#00aa00',
        shape: 'arrowDown',
        text: 'fall big'
      });
    }
    */
    
    if (tool.detectFallingEdge(candle)) {
      console.log('falling edge detected!');
    }
    /*
    if ((-tool.getLastCandlesTotalChange(5)) >= this.priceFallPercent) {
      this.priceDiffCapacitor = 0;
      if (priceDir == 'fall') {
        
        tool.addCandleMarker(candle, {
          position: 'belowBar',
          color: '#000000',
          shape: 'circle',
          text: '∆ƒ = ' + Number((tool.getLastCandlesTotalChange(5)).toFixed(2)) + '%'
        });
        
        console.log('price diff -' + priceDiff);
        if (candle.close > candle.open) {   // ------------- -  --   - - - -- -  ----  ----| candle pattern
          if (tool.getCandleBufferLast().close > tool.getCandleBufferLast().open) { // - --| detection
            if (tool.getCandleBufferLast2().close < tool.getCandleBufferLast2().open) {
              this.priceFallDetected = true;
              this.priceDiffCapacitor = 0;
              console.log(priceDiff + '% Price fall detected');
            }
          }
        }
      }
    } else if (this.priceDiffCapacitor < 0 && priceDir == 'rise') {
      this.priceDiffCapacitor = 0;
    }
    */
  }
  // PHASE TWO
  if (this.priceFallDetected) {
    if (candle.close > candle.open) {
      if (candle.close > tool.getCandleBufferLast().close) {
        this.entryPointDetected = true;
        console.log('Entry point detected. c=' + candle.close + ' o=' + candle.open);
        return true;
      }
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