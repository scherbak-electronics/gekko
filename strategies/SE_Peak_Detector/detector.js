var candleTypeDetector = require('./candle_detector');
var tool = {};
tool.detector = candleTypeDetector;
tool.init = function() {
  this.candleBuffer = [];
  this.bigDiff = 0.3;
  this.smallDiff = 0.1;
  this.fallingEdgeMaxLen = 30;
  this.fallingEdgeMinLen;
  this.needApprovement = false;
  
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


tool.detectCandleType = function(candle) {
  if (this.detector.isDoji(candle)) {
    this.addCandleMarker(candle, {
      position: 'belowBar',
      color: '#40d040',
      shape: 'arrowUp',
      text: '-'
    });
  }
}

tool.detectFall = function(candle) {
  let res = {};
  res.detected = false;
  let fpres = this.detectFallingPeak(candle);
  if (fpres.detected) { 
    //console.log('falling peak detected');
    let fbres = this.detectFallingBody(candle);
    if (fbres.detected) {
      //console.log('rising peak detected');
      let rbres = this.detectRisingBody(fbres.index);
      if (rbres.detected) {
        //console.log('rising body detected');
        let pfpres = this.detectPrevFallingPeak(rbres.index);
        if (pfpres.detected) {
          //console.log('previous falling peak detected');
          res.fallingPeak = fpres;
          res.fallingBody = fbres;
          res.risingBody = rbres;
          res.prevFallingPeak = pfpres;
          res.detected = true;
        }
      }
    }
  }
  return res;
}

tool.detectFallingPeak = function(candle) {
  let res = {};
  res.detected = false;
  var last = this.candleBuffer.length - 1;
  let prevCandle = this.candleBuffer[last];
  let prevPrevCandle = this.candleBuffer[last - 1];
  var position = this.getRelativePosition(prevCandle, candle);
  if ('up' == this.getCandleDirection(candle) && 'down' == this.getCandleDirection(prevCandle)) {
    if (position == 'align_bottom' || position == 'shift_up') {
      if (position == 'shift_up') {
        let cnRate = this.getCandleBodiesRate(candle, prevCandle);
        if (cnRate > 2) {
          res.peakTime = prevCandle.start;
          res.peakPrice = prevCandle.close;
          res.detected = true;
        }
      } else {
        let bodies = this.compareCandleBodies(candle, prevCandle);
        if (bodies == '1GT2' && !this.detector.isDoji(prevCandle)) {
          res.peakTime = prevCandle.start;
          res.peakPrice = prevCandle.close;
          res.detected = true;
        }
      }
    } 
  } else if ('up' == this.getCandleDirection(prevCandle) && 'up' == this.getCandleDirection(candle)) {
    if ('down' == this.getCandleDirection(prevPrevCandle)) {
      if (position == 'shift_up' || position == 'over') {
        res.peakTime = prevPrevCandle.start;
        res.peakPrice = prevPrevCandle.close;
        res.detected = true;
      }
    }
  }
  return res;
}

tool.detectFallingBody = function(candle) {
  let res = {};
  res.detected = false;
  let blackCount = 0;
  let whiteCount = 0;
  var index = 0;
  var blackSequenceDetected = false;
  var last = this.candleBuffer.length - 1;
  for (index = last - 2; index > 3; index--) {
    if ('down' == this.getCandleDirection(this.candleBuffer[index])) {
      blackCount++;
    } else if ('up' == this.getCandleDirection(this.candleBuffer[index])) {
      whiteCount++;
    }
    if (blackCount >= 4 && whiteCount == 0 && !blackSequenceDetected) {
      blackSequenceDetected = true;
    }
    let rpres = this.detectRisingPeak(index);
    if (rpres.detected && blackSequenceDetected) {
      let entryPointPrice = candle.close;
      let priceDiff = this.getPriceDiffPercent(rpres.peakPrice, entryPointPrice);
      if (priceDiff > 4) {
        res.risingPeak = rpres;
        res.index = index - 2;
        res.detected = true;
      }
    }
  }
  return res;
}

tool.detectPrevFallingPeak = function(index) {
  let res = {};
  res.detected = false;
  let c1dir = this.getCandleDirection(this.candleBuffer[index]);
  let c2dir = this.getCandleDirection(this.candleBuffer[index - 1]);
  let c3dir = this.getCandleDirection(this.candleBuffer[index - 2]);
  if (c1dir == 'up' && c2dir == 'down' && c3dir == 'down') {
    if (this.candleBuffer[index].close > this.candleBuffer[index - 1].close) {
      if (this.candleBuffer[index - 2].close > this.candleBuffer[index - 1].close) {
        res.detected = true;
        res.peakPrice = this.candleBuffer[index - 1].close;
        res.peakTime = this.candleBuffer[index - 1].start;
      }
    }
  }
  return res;
}

tool.detectRisingPeak = function(index) {
  let res = {};
  res.detected = false;
  let c1dir = this.getCandleDirection(this.candleBuffer[index]);
  let c2dir = this.getCandleDirection(this.candleBuffer[index - 1]);
  let c3dir = this.getCandleDirection(this.candleBuffer[index - 2]);
  if (c1dir == 'down' && c2dir == 'up' && c3dir == 'up') {
    if (this.candleBuffer[index - 1].close > this.candleBuffer[index].close) {
      let c2c3relPos = this.getRelativePosition(this.candleBuffer[index - 2], this.candleBuffer[index - 1]);
      if (c2c3relPos == 'shift_up') {
        res.detected = true;
        res.peakPrice = this.candleBuffer[index - 1].close;
        res.peakTime = this.candleBuffer[index - 1].start;
      }
    }
  }
  return res;
}

tool.detectRisingBody = function(index) {
  let res = {};
  res.detected = false;
  let blackCount = 0;
  let whiteCount = 0;
  let whiteSequenceDetected = false;
  for (; index > 3; index--) {
    if ('down' == this.getCandleDirection(this.candleBuffer[index])) {
      blackCount++;
    } else if ('up' == this.getCandleDirection(this.candleBuffer[index])) {
      whiteCount++;
    }
    if (whiteCount >= 3 && blackCount == 0 && !whiteSequenceDetected) {
      whiteSequenceDetected = true;
    }
    if (whiteSequenceDetected) {
      let c1dir = this.getCandleDirection(this.candleBuffer[index]);
      let c2dir = this.getCandleDirection(this.candleBuffer[index - 1]);
      let c3dir = this.getCandleDirection(this.candleBuffer[index - 2]);
      if (c1dir == 'up' && c2dir == 'down' && c3dir == 'down') {
        res.detected = true;
        res.peakPrice = this.candleBuffer[index - 1].close;
        res.peakTime = this.candleBuffer[index - 1].start;
        res.index = index;
      }
    }
  }
  return res;
}

tool.detectRise = function(candle) {
  let len = this.candleBuffer.length;
  let index = len - 1;
  let c0dir = this.getCandleDirection(candle);
  let c1dir = this.getCandleDirection(this.candleBuffer[index]);
  let c2dir = this.getCandleDirection(this.candleBuffer[index - 1]);
  let c3dir = this.getCandleDirection(this.candleBuffer[index - 2]);
  if (c2dir == 'up' && c3dir == 'up' && c0dir == 'down' && c1dir == 'down') {
    return true;
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

tool.getRelativePosition = function(refCandle, candle) {
  return this.detector.getRelativePosition(refCandle, candle);
}

tool.compareCandleBodies = function(candle1, candle2) {
  return this.detector.compareCandleBodies(candle1, candle2);
}

tool.getCandleBodiesRate = function(candle1, candle2) {
  return this.detector.getCandleBodiesRate(candle1, candle2);
}

tool.getBodyPosition = function(candle) {
  return this.detector.getBodyPosition(candle)
}
tool.getCandleShadowBodyRate = function(candle) {
  return this.detector.getCandleShadowBodyRate(candle);
}

tool.getCandleDirection = function(candle) {
  return this.detector.getCandleDirection(candle);
}

module.exports = tool;