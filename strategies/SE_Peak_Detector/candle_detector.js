const _ = require('lodash');
var detector = {};

detector.init = function(config) {
}

detector.getCandleDirection = function(candle) {
  if (candle.close < candle.open) {
    return 'down';
  } else {
    return 'up';
  }
}

detector.getCandleShadowBodyRate = function(candle) {
  let rate;
  let shadowSize = candle.high - candle.low;
  let bodySize;
  if (candle.open > candle.close) {
    bodySize = candle.open - candle.close;
  } else if (candle.open < candle.close) {
    bodySize = candle.close - candle.open;
  } else {
    bodySize = 0;
  }
  if (bodySize > 0) {
    if (shadowSize > bodySize) {
      rate = shadowSize / bodySize;
    } else if (shadowSize == bodySize){
      rate = 1;
    } else {
      // TODO: error handling
      rate = 1;
    }
  } else {
    rate = Infinity;
  }
  return rate;
}

detector.getBodyPosition = function(candle) {
  let hiBodyPos;
  let loBodyPos;
  if (candle.open > candle.close) {
    hiBodyPos = candle.open;
    loBodyPos = candle.close;
  } else {
    hiBodyPos = candle.close;
    loBodyPos = candle.open;
  }
  
  let hiShadowSize = candle.high - hiBodyPos;
  let loShadowSize = loBodyPos - candle.low;
  let shadowsRate = hiShadowSize / loShadowSize;
  console.log('shadowsRate = ' + shadowsRate);
  let isMiddle = ((1 >= shadowsRate && shadowsRate > 0.39) || (2 > shadowsRate && shadowsRate >= 1));
  let isMiddleUpper = (0.39 >= shadowsRate && shadowsRate > 0.42);
  let isUpper = (0.42 >= shadowsRate && shadowsRate > 0.25);
  let isUpperHi = (0.25 >= shadowsRate && shadowsRate > 0.11);
  let isHigh = (0.11 >= shadowsRate && shadowsRate > 0.02);
  let isTop = (0.02 >= shadowsRate);
  let isMiddleDown = (2.33 > shadowsRate && shadowsRate >= 2);
  let isDown = (4 > shadowsRate && shadowsRate >= 2.33);
  let isDownLow = (9 > shadowsRate && shadowsRate >= 4);
  let isLow = (20 > shadowsRate && shadowsRate >= 9);
  let isBottom = (shadowsRate >= 20);
  if (isMiddle) {
    return 'M';
  } else if (isMiddleUpper) {
    return 'MU';
  } else if (isUpper) {
    return 'U';
  } else if (isUpperHi) {
    return 'UH';
  } else if (isHigh) {
    return 'H';
  } else if (isTop) {
    return 'T';
  } else if (isMiddleDown) {
    return 'MD';
  } else if (isDown) {
    return 'D';
  } else if (isDownLow) {
    return 'DL';
  } else if (isLow) {
    return 'L';
  } else if (isBottom) {
    return 'B';
  } else {
    return 'ER'
  }
}

detector.getRelativePosition = function(refCandle, candle) {
  let refOpen = refCandle.open;
  let refClose = refCandle.close; 
  let open = candle.open;
  let close = candle.close;
  if ('up' == this.getCandleDirection(refCandle)) {
    refOpen = refCandle.close;
    refClose = refCandle.open;
  }
  if ('up' == this.getCandleDirection(candle)) {
    open = candle.close;
    close = candle.open;
  }
  if (open > refOpen && close > refClose && close < refOpen) {
    return 'shift_up';
  } else if (open < refOpen && open > refClose && close < refClose) {
    return 'shift_down';
  } else if (open == refOpen) {
    return 'align_top';
  } else if (close == refClose) {
    return 'align_bottom';
  } else if (open > refOpen && close < refClose) {
    return 'bigger';
  } else if (open < refOpen && close > refClose) {
    return 'smaller';
  } else if (open <= refClose && close <= refClose) {
    return 'under';
  } else if (open >= refOpen && close >=refOpen) {
    return 'over';
  } else {
    return 'none';
  }
}

detector.compareCandleBodies = function(candle1, candle2) {
  candle1 = this.setDownOpenClose(candle1);
  candle2 = this.setDownOpenClose(candle2);
  if ((candle1.open - candle1.close) > (candle2.open - candle2.close)) {
    return '1GT2';
  } else {
    return '2GT1';
  }
}

detector.getCandleBodiesRate = function(candle1, candle2) {
  candle1 = this.setDownOpenClose(candle1);
  candle2 = this.setDownOpenClose(candle2);
  return (candle1.open - candle1.close) / (candle2.open - candle2.close); 
}

// DOJI
//
//          |           
//          |
//          |
//        ----- 5%
//          |
//          |
//          |
//
detector.isDoji = function(candle) {
  if (12 < this.getCandleShadowBodyRate(candle)) {
    return true;
    let pos = this.getBodyPosition(candle);
    if (pos == 'M' || pos == 'MU' || pos == 'U' || pos == 'MD' || pos == 'D' || pos == 'DL' || pos == 'UH') {
      
    }
  }
  return false;
}

// DOJI DRAGONFLY
//
//       _____  5%
//         |
//         |
//         |
//         |
//         |
//         |
//
detector.isDojiDragonfly = function(candle) {
  if (0.08 >= this.getCandleShadowBodyRate(candle)) {
    let pos = this.getBodyPosition(candle);
    if (pos == 'UH' || pos == 'H' || pos == 'T') {
      return true;
    }
  }
  return false;
}

// DOJI GRAVESTONE
//
//         |
//         |
//         |
//         |
//         |
//       ----- 5%
//
detector.isDojiGravestone = function(candle) {
  if (0.08 >= this.getCandleShadowBodyRate(candle)) {
    let pos = this.getBodyPosition(candle);
    if (pos == 'L' || pos == 'B') {
      return true;
    }
  }
  return false;
}

// HANGING MAN
//        ___
//       |   |
//       |   | 35%
//        ---
//         |
//         |
//         |
//         |
//         |
//
detector.isHangingMan = function(candle) {
  return false;
}

// HAMMER
// The lower shadow should be at least two times the height of the real body.
detector.isHammer = function() {
  return false;
}

// SHAVEN HEAD
//       
//        ___
//       |   | 50%
//       |   |
//        ---
//         |
//         |        
//
detector.isShavenHead = function() {
  return false;
}

// BIG
//         |
//        ---
//       |   |
//       |   | 80%
//       |   |
//       |   | 
//       |___|
//         |        
//
detector.isBig = function() {
  return false;
}

detector.checkPatternConditions = function(pattern, conditions) {
  
  return false;
}

detector.setDownOpenClose = function(candle) {
  var res = _.clone(candle);
  if ('up' == this.getCandleDirection(candle)) {
    res.open = candle.close;
    res.close = candle.open;
  }
  return res;
}

module.exports = detector;