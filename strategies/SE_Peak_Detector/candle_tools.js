var tool = {};
tool.init = function() {
  this.candleBuffer = [];
  this.bigDiff = 0.3;
  this.smallDiff = 0.1;
  this.fallingEdgeMaxLen = 30;
  this.fallingEdgeMinLen;
}

tool.addToCandleBuffer = function(candle) {
  this.candleBuffer.push(candle);
}

tool.getCandleBufferLast = function() {
  return this.candleBuffer[this.candleBuffer.length - 1];
}

tool.getCandleBufferLast2 = function() {
  return this.candleBuffer[this.candleBuffer.length - 2];
}

tool.getLastCandlesTotalChange = function(num) {
  var accum = 0;
  for (var ind = 0; ind < num; ind++) {
    let close = this.candleBuffer[(this.candleBuffer.length - 1) - ind].close;
    let preClose = this.candleBuffer[(this.candleBuffer.length - 2) - ind].close;
    accum += this.getPriceDiffPercent(preClose, close); 
  }
  return accum;
}

tool.getCandleSize = function(candle) {
  if (candle.close < candle.open) {
    return candle.open - candle.close;
  } else {
    return candle.close - candle.open;
  }
}

tool.getCandleType = function(candle) {
  let candleType = undefined;
  if (candle.close < candle.open) {
    candleType = 'falling';
  } else {
    candleType = 'rising';
  }
  let diff = this.getPriceDiffPercent(candle.close, candle.open); 
  if (diff < 0) {
    diff = -diff;
  }
  if (diff > this.bigDiff) {
    candleType += '_big';
  } else if (diff < this.smallDiff) {
    candleType += '_small';
  }
  return candleType;
}

tool.getPriceDiffPercent = function(newPrice, oldPrice) {
  /*
  If the price increased, use the formula [(New Price - Old Price)/Old Price] 
  and then multiply that number by 100. If the price decreased, 
  use the formula [(Old Price - New Price)/Old Price] and multiply that number by 100.
  */
  let priceDiffPercent = 0;
  if (newPrice > oldPrice) {
    priceDiffPercent = ((newPrice - oldPrice) / oldPrice) * 100;
    return priceDiffPercent;
  } else {
    priceDiffPercent = ((oldPrice - newPrice) / oldPrice) * 100;
    return -priceDiffPercent;
  }
}

tool.detectFallingEdge = function(candle) {
  var index; 
  var last = this.candleBuffer.length - 1;
  if ('rising_big' == this.getCandleType(candle) || 'rising_big' == this.getCandleType(candle)) {
    if ('rising_big' == this.getCandleType(this.candleBuffer[last]) || 'rising' == this.getCandleType(this.candleBuffer[last])) {
      if ('falling_big' == this.getCandleType(this.candleBuffer[last - 1]) || 'falling' == this.getCandleType(this.candleBuffer[last])) {
        console.log('entry pattern detected');
        let fallBigCnt = 1;
        let riseCnt = 0;
        let previousPeakFound = false;
        let edgeCandlesCnt = 0;
        for (index = last - 2; index > (last - this.fallingEdgeMaxLen); index--) {
          let cndlType = this.getCandleType(this.candleBuffer[index]);
          let tailCandle1 = this.getCandleType(this.candleBuffer[index - 1]);
          let tailCandle2 = this.getCandleType(this.candleBuffer[index - 2]);
          if (cndlType == 'falling_big' || cndlType == 'falling') {
            console.log('after entry: falling_big detected')
            fallBigCnt++;
            if (tailCandle1 == 'rising_big' || tailCandle1 == 'rising_small' || tailCandle1 == 'rising') {
              console.log('after entry: tail 1 detected');
              if (tailCandle2 == 'rising_big') {
                console.log('after entry: tail 2 detected');
                if (this.candleBuffer[index - 1].close > this.candleBuffer[index - 2].close) {
                  previousPeakFound = true;
                  console.log('after entry: PEAK detected');
                  break;
                }
              }
            }
          } else if (cndlType == 'rising' || cndlType == 'rising_big' || cndlType == 'rising_small') {
            riseCnt++;
          } else {
            console.log('after entry: skip candle');
          }
          edgeCandlesCnt++;
        }
        let fallToRiseRatio = this.getNumbersRatio(riseCnt,  fallBigCnt);
        console.log('fallToRiseRatio = ' + fallToRiseRatio + ' fc=' + fallToRiseRatio + ' rc=' + riseCnt);
        if (fallBigCnt > 5 && previousPeakFound) {
          console.log('a lot of falling_big candels detected');
          if (fallToRiseRatio < 0.5) {
            console.log('just a few rising candels detected');
            this.addCandleMarker(candle, {
              position: 'aboveBar',
              color: '#00aa00',
              shape: 'arrowDown',
              text: 'f=' + fallBigCnt + ' r=' + riseCnt + ' e=' + edgeCandlesCnt
            });
            return true;
          }
        }
      }
    }
  }
  return false;
}

tool.getNumbersRatio = function(bigNumber, smallNumber) {
  return bigNumber / smallNumber;
}

tool.findSmallestCandle = function() {

}

tool.findBiggestCandle = function() {

}

tool.addCandleMarker = function(candle, marker) {
  let sampleMarker = {
    time: candle.date,
    position: 'belowBar', // (aboveBar | belowBar | inBar) - item position
    shape: 'arrowUp', // (circle | square | arrowUp | arrowDown) - item marker type
    size: 1, // (number | undefined) - size multiplier of the marker, the shape is hidden when set to 0, default value is 1
    color: '#1111dd', // (string) - item color
    //id: markerId, // (string | undefined) - item id, will be passed to click/crosshair move handlers
    text: 'X' // (string | undefined) - item text to be shown
  };
  if (marker.text) {
    let spaces = new Array(marker.text.length);
    spaces = spaces.fill(' ', 0, spaces.length - 1);
    spaces = spaces.join('');
    marker.time = candle.start.unix();
    marker.text = spaces + marker.text;
  }
  if (candle.markers && candle.markers.length) {
    candle.markers.push(marker);
  } else {
    candle.markers = [];
    candle.markers.push(marker);
  }
}

module.exports = tool;