
import utils from 'utilities.js';
import moment from 'moment';

export default function(_data, _trades, _width, _height) {

  const
  identity = function(v){return v;};

  var
  PROP_EL     = '_el',
  PROP_SVG    = '_svg',
  PROP_DATA   = '_data',
  PROP_WIDTH  = '_width',
  PROP_HEIGHT = '_height',
  PROP_BAR_SPACING   = '_barSpacing',
  PROP_DPROP_LOW     = '_propertyLow',
  PROP_DPROP_HIGH    = '_propertyHigh',
  PROP_DPROP_VOL     = '_propertyVolume',
  PROP_DPROP_DATE    = '_propertyDate',
  PROP_DPROP_CLOSE   = '_propertyClose',
  PROP_DPROP_OPEN    = '_propertyOpen',
  PROP_MAR_CANDLE    = '_marginCandle',
  PROP_MAR_VOLUME    = '_marginVolume',
  PROP_COL_CANDBG    = '_colorCandleBackground',
  PROP_COL_BODYDN    = '_colorBodyDown',
  PROP_COL_BODYUP    = '_colorBodyUp',
  PROP_COL_STEMDN    = '_colorStemDown',
  PROP_COL_STEMUP    = '_colorStemUp',
  PROP_COL_VOLBG     = '_colorVolBackground',
  PROP_COL_VOLDN     = '_colorVolSell',
  PROP_COL_VOLUP     = '_colorVolBuy',
  PROP_COL_VOLDNBORD = '_colorVolSellBorder',
  PROP_COL_VOLUPBORD = '_colorVolBuyBorder',
  PROP_COL_LABTIMEBG = '_colorLabelTimeBackground',
  PROP_COL_LABTIMEFG = '_colorLabelTimeForeground',
  PROP_COL_LABCANBG  = '_colorLabelCandleBackground',
  PROP_COL_LABCANFG  = '_colorLabelCandleForeground',
  PROP_COL_LABVOLBG  = '_colorLabelVolumeBackground',
  PROP_COL_LABVOLFG  = '_colorLabelVolumeForeground',
  PROP_LAB_FAM       = '_labelFontFamily',
  PROP_LAB_SIZE      = '_labelFontSize';

  function D3CandleStickChart (el, props) {
    this[PROP_WIDTH]        = 320;
    this[PROP_HEIGHT]       = 240;
    this[PROP_DATA]          = [];

    if(window.d3 === undefined) {
      throw new Error('Unable to locate the d3 library');
    }

    props = utils.isPlainObject(props) ? props : {};

    // load any data in the props

    this.width  = props.width;
    this.height = props.height;
    this.parent = el || document.body;

    this[PROP_DPROP_LOW]     = props.propertyLow                || 'low';
    this[PROP_DPROP_HIGH]    = props.propertyHigh               || 'high';
    this[PROP_DPROP_VOL]     = props.propertyVolume             || 'volume';
    this[PROP_DPROP_DATE]    = props.propertyDate               || 'date';
    this[PROP_DPROP_CLOSE]   = props.propertyClose              || 'close';
    this[PROP_DPROP_OPEN]    = props.propertyOpen               || 'open';
    this[PROP_BAR_SPACING]   = props.barSpacing                 || 0.35;
    this[PROP_MAR_CANDLE]    = props.marginCandle               || 15;
    this[PROP_MAR_VOLUME]    = props.marginVolume               || 5;
    this[PROP_COL_CANDBG]    = props.colorCandleBackground      || '#111';
    this[PROP_COL_BODYDN]    = props.colorCandleBodyDown        || '#FF2121';
    this[PROP_COL_BODYUP]    = props.colorCandleBodyUp          || this[PROP_COL_CANDBG];
    this[PROP_COL_STEMDN]    = props.colorCandleStemDown        || this[PROP_COL_BODYDN];
    this[PROP_COL_STEMUP]    = props.colorCandleStemUp          || '#1BD31B';
    this[PROP_COL_VOLBG]     = props.colorVolumeSell            || '#222';
    this[PROP_COL_VOLDN]     = props.colorVolumeBuy             || this[PROP_COL_BODYDN];
    this[PROP_COL_VOLUP]     = props.colorVolumeSellBorder      || this[PROP_COL_VOLBG];
    this[PROP_COL_VOLDNBORD] = props.colorVolumeBuyBorder       || this[PROP_COL_BODYDN];
    this[PROP_COL_VOLUPBORD] = props.colorVolumeBackground      || this[PROP_COL_STEMUP];
    this[PROP_COL_LABTIMEBG] = props.colorLabelTimeBackground   || '#333';
    this[PROP_COL_LABTIMEFG] = props.colorLabelTimeForeground   || '#aaa';
    this[PROP_COL_LABCANBG]  = props.colorLabelCandleBackground || '#333';
    this[PROP_COL_LABCANFG]  = props.colorLabelCandleForeground || '#aaa';
    this[PROP_COL_LABVOLBG]  = props.colorLabelVolumeBackground || '#444';
    this[PROP_COL_LABVOLFG]  = props.colorLabelVolumeForeground || '#bbb';
    this[PROP_LAB_FAM]       = props.labelFontFamily            || 'Ubuntu';
    this[PROP_LAB_SIZE]      = props.labelFontSize              || 10;

    this.loadData(props.data);
  }

  function redrawIdent () {
    return function (val) {
      this.redraw(this.svg, this.data);
      return val;
    };
  }

  function redrawGetSetter (prop, allowNull) {
    return {
      get: utils.getter(prop),
      set: utils.setter(prop, allowNull, redrawIdent()),
    };
  }

  Object.defineProperties(D3CandleStickChart.prototype, {
    parent: { // auto-install if this gets changed.
      get: utils.getter(PROP_EL),
      set: utils.setter(PROP_EL, false, function (parent) {
        if (parent) {
          if (this.parent) { // un-install any previous charts in parent
            this.uninstall(this.parent);
          }
          return this.install(parent);
        }

        return this.parent;
      })
    },
    svg: {
      get: utils.getter(PROP_SVG)
    },
    width: {
      get: utils.getter(PROP_WIDTH),
      set: utils.setterInt(PROP_WIDTH, 0)
    },
    height: {
      get: utils.getter(PROP_HEIGHT),
      set: utils.setterInt(PROP_HEIGHT, 0)
    },
    aspectRatio: {
      get: function () {
        return this.height / this.width;
      }
    },
    data: {
      get: utils.getter(PROP_DATA)
    },

    propertyLow:                 redrawGetSetter(PROP_DPROP_LOW),
    propertyHigh:                redrawGetSetter(PROP_DPROP_HIGH),
    propertyVolume:              redrawGetSetter(PROP_DPROP_VOL),
    propertyDate:                redrawGetSetter(PROP_DPROP_DATE),
    propertyClose:               redrawGetSetter(PROP_DPROP_CLOSE),
    propertyOpen:                redrawGetSetter(PROP_DPROP_OPEN),
    barSpacing:                  redrawGetSetter(PROP_BAR_SPACING),
    marginCandle:                redrawGetSetter(PROP_MAR_CANDLE),
    marginVolume:                redrawGetSetter(PROP_MAR_VOLUME),
    colorCandleBackground:       redrawGetSetter(PROP_COL_CANDBG),
    colorCandleBodyDown:         redrawGetSetter(PROP_COL_BODYDN),
    colorCandleBodyUp:           redrawGetSetter(PROP_COL_BODYUP),
    colorCandleStemDown:         redrawGetSetter(PROP_COL_STEMDN),
    colorCandleStemUp:           redrawGetSetter(PROP_COL_STEMUP),
    colorVolumeSell:             redrawGetSetter(PROP_COL_VOLDN),
    colorVolumeBuy:              redrawGetSetter(PROP_COL_VOLUP),
    colorVolumeSellBorder:       redrawGetSetter(PROP_COL_VOLDNBORD),
    colorVolumeBuyBorder:        redrawGetSetter(PROP_COL_VOLUPBORD),
    colorVolumeBackground:       redrawGetSetter(PROP_COL_VOLBG),
    colorLabelTimeBackground:    redrawGetSetter(PROP_COL_LABTIMEBG),
    colorLabelTimeForeground:    redrawGetSetter(PROP_COL_LABTIMEFG),
    colorLabelCandleBackground:  redrawGetSetter(PROP_COL_LABCANBG),
    colorLabelCandleForeground:  redrawGetSetter(PROP_COL_LABCANFG),
    colorLabelVolumeBackground:  redrawGetSetter(PROP_COL_LABVOLBG),
    colorLabelVolumeForeground:  redrawGetSetter(PROP_COL_LABVOLFG),
    labelFontFamily:             redrawGetSetter(PROP_LAB_FAM),
    labelFontSize:               redrawGetSetter(PROP_LAB_SIZE)
  });

  D3CandleStickChart.low = function (prev, next) {
    if(prev === null) return next;
    return (next===null) ? prev : Math.min(prev, next);
  };

  D3CandleStickChart.high = function (prev, next) {
    if(prev === null) return next;
    return (next===null) ? prev : Math.max(prev, next);
  };

  D3CandleStickChart.dateMS = function (v) {
    if(v instanceof Date) return v.getTime();
    if(typeof v === 'string') {
      var ms = Date.parse(v);
      if(isNaN(ms)) return null;
      return ms;
    }
    if(typeof v === 'number'&&!isNaN(v)) return v;
    return null;
  };

  D3CandleStickChart.lowDate = function (prev, next) {
    return D3CandleStickChart.low(prev, D3CandleStickChart.dateMS(next));
  };

  D3CandleStickChart.highDate = function (prev, next) {
    return D3CandleStickChart.high(prev, D3CandleStickChart.dateMS(next));
  };

  D3CandleStickChart.dateSeriesMinutes = function (ms) {
    return moment(ms).format('mm:ss');
  };

  D3CandleStickChart.dateSeriesHours = function (ms) {
    return moment(ms).format('HH:mm');
  };

  D3CandleStickChart.dateSeriesDays = function (ms) {
    return moment(ms).format('MMM, DD');
  };

  D3CandleStickChart.dateSeriesMonths = function (ms) {
    return moment(ms).format('MMM, YYYY');
  };

  D3CandleStickChart.dateSeriesYears = function (ms) {
    return moment(ms).format('MMM, YYYY');
  };

  D3CandleStickChart.dateSeriesFunctionFromDiff = function (start, end) {
    var diff = Math.abs(D3CandleStickChart.dateMS(start) - D3CandleStickChart.dateMS(end));
    return (diff >= 3.1104e+10
      ? D3CandleStickChart.dateSeriesYears : (diff >= 2.592e+9
      ? D3CandleStickChart.dateSeriesMonths : (diff >= 1.728e+8
      ? D3CandleStickChart.dateSeriesDays : (diff >= 3.6e+6
      ? D3CandleStickChart.dateSeriesHours : D3CandleStickChart.dateSeriesMinutes
    ))));
  };

  D3CandleStickChart.getScales = function (data, spec) {
    spec = spec || {};
    var
    propLow  = spec.propertyLow    ||'low',
    propHigh = spec.propertyHigh   ||'high',
    propVol  = spec.propertyVolume ||'volume',
    propDate = spec.propertyDate   ||'date';

    return data.reduce(function (p, c) { // find all domains using a single data iteration (optimal)
      p.lowestLow   = D3CandleStickChart.low(p.lowestLow,     c[propLow]);
      p.highestHigh = D3CandleStickChart.high(p.highestHigh,  c[propHigh]);
      p.volumeLow   = D3CandleStickChart.low(p.volumeLow,     c[propVol]);
      p.volumeHigh  = D3CandleStickChart.high(p.volumeHigh,   c[propVol]);
      p.dateLow     = D3CandleStickChart.lowDate(p.dateLow,   c[propDate]);
      p.dateHigh    = D3CandleStickChart.highDate(p.dateHigh, c[propDate]);
      return p;
    }, { // seed the unprocessed domains
      lowestLow:   null,
      highestHigh: null,
      volumeLow:   null,
      volumeHigh:  null,
      dateLow:     null,
      dateHigh:    null
    });
  };

  D3CandleStickChart.prototype.resize = function (width, height, svg) {
    svg    = svg || this.svg;
    width  = width || this.width;
    height = height || this.height;

    svg.attr('width', width);
    svg.attr('height', height);

    if(width !== this.width) {
      this.width = width;
    }
    if(height !== this.height) {
      this.height = height;
    }

    return this;
  };

  D3CandleStickChart.prototype.clearData = function () {
    this.data.splice(0, this.data.length);
    this.reset();
    return true;
  };

  D3CandleStickChart.prototype.loadData = function (data) {
    if(!utils.isArray(data)) return false;
    Array.prototype.push.apply(this.data, data);
    if(this.parent) this.redraw();
    return true;
  };

  D3CandleStickChart.prototype.reset = function (svg) {
    svg = svg || this.svg;
    this.resetCandles(svg);
    this.resetVolume(svg);
    this.resetLabels(svg);
  };

  D3CandleStickChart.prototype.getScales = function (data) {
    return D3CandleStickChart.getScales(data || this.data, {
      propertyLow:    this.propertyLow,
      propertyHigh:   this.propertyHigh,
      propertyVolume: this.propertyVolume,
      propertyDate:   this.propertyDate
    });
  };

  D3CandleStickChart.prototype.coordCandles = function () {
    var
    volcoord = this.coordVolume();

    return {
      x: volcoord.x,
      y: 0,
      h: volcoord.y,
      w: volcoord.w
    };
  };

  D3CandleStickChart.prototype.resetCandles = function (svg) {
    svg.selectAll('g.candles').remove();
    return this;
  };

  D3CandleStickChart.prototype.redrawCandles = function (svg, scales) {
    var
    propLow       = this.propertyLow,
    propHigh      = this.propertyHigh,
    propVol       = this.propertyVolume,
    propDate      = this.propertyDate,
    propClose     = this.propertyClose,
    propOpen      = this.propertyOpen,
    colorBG       = this.colorCandleBackground,
    colorBodyDown = this.colorCandleBodyDown,
    colorBodyUp   = this.colorCandleBodyUp,
    colorStemDown = this.colorCandleStemDown,
    colorStemUp   = this.colorCandleStemUp,
    margin        = this.marginCandle || 0,
    coord = this.coordCandles(),
    approxW  = (coord.w / this.data.length),
    barSpace = approxW * this.barSpacing,
    barWidth = approxW - barSpace,
    stemWidth = barWidth * 0.15,
    group = svg.append('g')
      .attr('class', 'candles')
      .attr('transform', 'translate('+[coord.x, coord.y].join(' ') +')')
    this.initCalcDateXAndCalcRY(this.data)
    var
    calcDateX = this.calcDateX,
    calcRY = this.calcRY

    if(stemWidth < 1)  {
      stemWidth = 1;
    }
    if(barWidth < 1)  {
      barWidth = 1;
    }

    group.append('rect')
      .attr('class', 'background')
      .attr('width', coord.w)
      .attr('height', coord.h)
      .attr('fill', colorBG);

    var
    dOpenCloseMin = function (d) { return Math.min(d[propClose], d[propOpen]); },
    dOpenCloseMax = function (d) { return Math.max(d[propClose], d[propOpen]); },
    dIsDown       = function (d) { return d[propClose] < d[propOpen]; },
    dStemColor    = function (d) { return dIsDown(d) ? colorStemDown : colorStemUp; },
    dBodyColor    = function (d) { return dIsDown(d) ? colorBodyDown : colorBodyUp; };

    if(stemWidth > 0) {
      group.selectAll('rect.candle-stem')
        .data(this.data)
        .enter().append('rect')
        .attr('class', 'candle-stem')
        .attr('width', stemWidth)
        .attr('x', function (d) { return calcDateX(d[propDate]) + ((barWidth/2) - (stemWidth/2)); })
        .attr('y', function (d) {
          return calcRY(d[propHigh]);
        })
        .attr('height', function (d) {
          return calcRY(d[propLow]) - calcRY(d[propHigh]);
        })
        .attr('fill', dStemColor);
    }

    group.selectAll('rect.candle-body')
      .data(this.data)
      .enter().append('rect')
      .attr('class', 'candle-body')
      .attr('width', barWidth)
      .attr('vmin', dOpenCloseMin)
      .attr('vmax', dOpenCloseMax)
      .attr('x', function (d) { return calcDateX(d[propDate]); })
      .attr('y', function (d) { return calcRY(this.getAttribute('vmax')); })
      .attr('height', function (d) {
        return calcRY(this.getAttribute('vmin'))-calcRY(this.getAttribute('vmax'));
      })
      .attr('stroke-width', 0.5)
      .attr('stroke-linecap', 'butt')
      .attr('stroke-rendering', 'crispEdges')
      .attr('stroke', dStemColor)
      .attr('fill', dBodyColor);

    return svg;
  };

  D3CandleStickChart.prototype.initCalcDateXAndCalcRY = function(data){
    var
    scales = this.getScales(data),
    coord =  this.coordCandles(),
    margin        = this.marginCandle || 0,
    approxW  = (coord.w / data.length),
    barSpace = approxW * this.barSpacing,
    barWidth = approxW - barSpace
    if(barWidth < 1)  {
      barWidth = 1;
    }

    this.calcDateX = d3.scaleLinear()
              .domain([scales.dateLow, scales.dateHigh])
                .range([0, coord.w - barWidth]),
    this.calcRY = d3.scaleLinear()
              .domain([scales.lowestLow, scales.highestHigh])
                .range([coord.h - margin, margin]);

  }


  D3CandleStickChart.prototype.tradePoints =  function (_trades) {
    var svg = this.svg,
        calcDateX = this.calcDateX,
        calcRY = this.calcRY
    const toDate = i => {
      if(_.isNumber(i)) {
        return moment.unix(i).utc().toDate();
      } else {
        return moment.utc(i).toDate();
      }
    }
    const trades = _trades.map(t => {
      return {
        price: t.price,
        date: moment.utc(t.date).toDate(),
        action: t.action
      }
    });

    svg
    .append('g')
    .attr("transform", "translate(0, 0)")
      .selectAll("circle")
      .data(trades)
      .enter().append("circle")
        .attr('class', function(d) { return d.action })
        .attr("cx", function(d) { return calcDateX(d.date); })
        .attr("cy", function(d) { return calcRY(d.price); })
        .attr('r', 5);
  }

  D3CandleStickChart.prototype.coordVolume = function () {
    var
    volheight = 100,
    coordlabels = this.coordLabels(),
    coordSX = coordlabels.seriesX;

    if(volheight / this.height > 0.25) {
      volheight = 50;
    }

    return {
      x: coordSX.x,
      y: coordSX.y - volheight,
      w: coordSX.w,
      h: volheight
    };
  };

  D3CandleStickChart.prototype.resetVolume = function (svg) {
    svg.selectAll('g.volume').remove();
    return this;
  };

  D3CandleStickChart.prototype.smaLine = function (svg, scales) {
    var
    calcDateX = this.calcDateX,
    calcRY = this.calcRY

    var line = d3.line()
                  .x(function(d) { return calcDateX(d.date); })
                  .y(function(d) { return calcRY((d.sma_25 || d.close)); });
    var focus = svg.append("g")
      .attr("class", "focus")
      .attr("transform", "translate(0, 0)");
    focus.append("path")
      .datum(this.data)
      .attr("class", "line price")
      .attr("d", line);
    try{
      var line2 = d3.line()
                  .x(function(d) { return calcDateX(d.date); })
                  .y(function(d) { return calcRY((d.sma_7 || d.close)); });
      var focus2 = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(0, 0)");
      focus2.append("path")
        .datum(this.data)
        .attr("class", "line7 price")
        .attr("d", line2);
    }catch(e){
      console.log(e)
    }
    return svg;
  }

  D3CandleStickChart.prototype.redrawVolume = function (svg, scales) {
    var
    coord              = this.coordVolume(),
    propVol            = this.propertyVolume,
    propDate           = this.propertyDate,
    propClose          = this.propertyClose,
    propOpen           = this.propertyOpen,
    colorVolSell       = this.colorVolumeSell,
    colorVolBuy        = this.colorVolumeBuy,
    colorVolSellBorder = this.colorVolumeSellBorder,
    colorVolBuyBorder  = this.colorVolumeBuyBorder,
    colorBG            = this.colorVolumeBackground,
    approxW            = (coord.w / this.data.length),
    barSpace           = approxW * this.barSpacing,
    barWidth           = approxW - barSpace,
    margin             = this.marginVolume || 0,
    _this              = this;

    if(barWidth < 1)  {
      barWidth = 1;
    }
    var
    group = svg.append('g')
      .attr('class', 'volume')
      .attr('transform', 'translate('+[coord.x, coord.y].join(' ') +')'),
    calcDateX = d3.scaleLinear()
      .domain([scales.dateLow, scales.dateHigh])
        .range([0, coord.w - barWidth]),
    calcVolHeight = d3.scaleLinear()
      .domain([scales.volumeLow, scales.volumeHigh])
        .range([2, coord.h - margin]),
    dIsDown        = function (d) { return d[propClose] < d[propOpen]; },
    dColorBars     = function (d) { return dIsDown(d) ? colorVolSell : colorVolBuy; },
    dColorBarsBord = function (d) { return dIsDown(d) ? colorVolSellBorder : colorVolBuyBorder; };

    group.append('rect')
      .attr('class', 'background')
      .attr('width', coord.w)
      .attr('height', coord.h)
      .attr('fill', colorBG);

    group.selectAll('rect.volume-bar')
      .data(this.data)
      .enter().append('rect')
      .attr('class', 'volume-bar')
      .attr('fill', dColorBars)
      .attr('stroke', dColorBarsBord)
      .attr('width', barWidth)
      .attr('stroke-width', 0.5)
      .attr('stroke-linecap', 'butt')
      .attr('stroke-rendering', 'crispEdges')
      .attr('height', function (d) {
        return calcVolHeight(d[propVol]);
      })
      .attr('x', function (d) {
        return calcDateX(d[propDate]);
      })
      .attr('y', function (d) {
        return (coord.h - (parseInt(this.getAttribute('height'))));
      });

    return svg;
  };

  D3CandleStickChart.prototype.coordLabels = function () {
    var
    xheight = 20,
    ywidth  = 75;

    return {
      seriesX: {
        x: 0,
        y: this.height - xheight,
        w: this.width - ywidth,
        h: xheight
      },
      seriesY: {
        x: this.width - ywidth,
        y: 0,
        w: ywidth,
        h: this.height
      }
    };
  };

  D3CandleStickChart.prototype.resetLabels = function (svg) {
    svg.selectAll('g.labels').remove();
    return this;
  };

  D3CandleStickChart.prototype.redrawLabels = function (svg, scales) {
    var
    coord         = this.coordLabels(),
    coordvol      = this.coordVolume(),
    coordcand     = this.coordCandles(),
    fontFamily    = this.labelFontFamily,
    fontSize      = this.labelFontSize || 10,
    colorTimeBG   = this.colorLabelTimeBackground,
    colorTimeFG   = this.colorLabelTimeForeground,
    colorCandleBG = this.colorLabelCandleBackground,
    colorCandleFG = this.colorLabelCandleForeground,
    colorVolumeBG = this.colorLabelVolumeBackground,
    colorVolumeFG = this.colorLabelVolumeForeground,
    marginCandle  = this.marginCandle || 0,
    marginVolume  = this.marginVolume || 0,
    cSX = coord.seriesX,
    cSY = coord.seriesY,
    groupY = svg.append('g')
      .attr('class', 'labels label-y')
      .attr('transform', 'translate('+[cSY.x, cSY.y].join(' ') +')'),
    groupX = svg.append('g')
      .attr('class', 'labels label-x')
      .attr('transform', 'translate('+[cSX.x, cSX.y].join(' ') +')'),

    // time series data & functions:
    timeticks = 10,
    dateX = d3.scaleLinear()
      .domain([scales.dateLow, scales.dateHigh])
        .range([cSX.x, cSX.x + cSX.w]),

    // candle data & functions:
    candticks = 6,
    candY = d3.scaleLinear()
      .domain([scales.lowestLow, scales.highestHigh])
        .range([coordcand.y + coordcand.h - marginCandle, coordcand.y + marginCandle]),

    // volume data & functions:
    volticks = 5,
    volY = d3.scaleLinear()
      .domain([scales.volumeLow, scales.volumeHigh])
        .range([coordvol.y + coordvol.h, coordvol.y + fontSize + marginVolume]);

    groupX.append('rect') // placeholder for time-series labels
      .attr('width', cSX.w)
      .attr('height', cSX.h)
      .attr('fill', colorTimeBG);

    groupY.append('rect') // placeholder for X labels (end-cap)
     .attr('y', cSX.y)
     .attr('width', cSY.w)
     .attr('height', cSX.h)
     .attr('fill', colorTimeBG);

    groupX.selectAll('text.series-x')
      .data(dateX.ticks(timeticks))
      .enter().append('svg:text')
      .attr('class', 'series-x')
      .attr('x', dateX)
      .attr('y', 0)
      .attr('dy', (cSX.h/2)+(fontSize/2))
      .attr('font-family', fontFamily)
      .attr('font-size', fontSize)
      .attr('text-anchor', 'middle')
      .attr('fill', colorTimeFG)
      .text(D3CandleStickChart.dateSeriesFunctionFromDiff(scales.dateLow, scales.dateHigh));

    // candle labels
    groupY.append('rect') // background
      .attr('y', coordcand.y)
      .attr('width', cSY.w)
      .attr('height', coordcand.h)
      .attr('fill', colorCandleBG);

    groupY.selectAll('text.candle-label') // ticks
      .data(candY.ticks(candticks))
      .enter().append('text')
      .attr('class', 'candle-label')
      .attr('x', 0)
      .attr('y', candY)
      .attr('dx', cSY.w/2)
      // .attr('dy', fontSize/2)
      .attr('font-family', fontFamily)
      .attr('font-size', fontSize)
      .attr('text-anchor', 'middle')
      .attr('fill', colorCandleFG)
      .text(function (d) {
        return utils.isNumber(d) ? ( d < 1 ? d.toFixed(4) : d) : d;
      });

    // volume labels:
    groupY.append('rect') // background
      .attr('y', coordvol.y)
      .attr('width', cSY.w)
      .attr('height', coordvol.h)
      .attr('fill', colorVolumeBG);

    groupY.selectAll('text.vol-label') // ticks
      .data(volY.ticks(volticks))
      .enter().append('text')
      .attr('class', 'vol-label')
      .attr('x', 0)
      .attr('y', volY)
      .attr('dx', cSY.w/2)
      .attr('dy', 0)
      .attr('fill', colorVolumeFG)
      .attr('font-family', fontFamily)
      .attr('font-size', fontSize)
      .attr('text-anchor', 'middle')
      .text(String);

    return svg;
  };

  D3CandleStickChart.prototype.redraw = function (svg, data) {
    svg  = svg  || this.svg;
    data = data || this.data;

    // clear existing charted data
    this.reset(svg);

    if(!data.length) { // bail out if no data
      return svg;
    }

    // resize SVG to outer limits
    svg.attr('width', this.width);
    svg.attr('height', this.height);
    svg.attr('viewBox', '0 0 '+ this.width + ' ' + this.height);

    var
    /***** scales:
    * lowestLow
    * highestHigh
    * volumeLow
    * volumeHigh
    * dateLow
    * dateHigh
    *****/
    scales = this.getScales(data);

    this.redrawCandles(svg, scales);
    this.redrawVolume(svg, scales);
    this.redrawLabels(svg, scales);
    this.smaLine(svg, scales);
  };

  D3CandleStickChart.prototype.initView = function (svg) {
    this.resize(this.width, this.height, svg);
    this.redraw(svg, this.data);
    return svg;
  };

  D3CandleStickChart.prototype.install = function (parent) {
    parent = parent || this.parent;
    if(!parent) {
      return false;
    }

    // set the parent's svg context
    this[PROP_SVG] = this.initView(d3.select(parent).append('svg:svg'));

    return parent;
  };

  D3CandleStickChart.prototype.uninstall = function (parent) {
    d3.select(parent||this.parent)
      .select('svg')
      .remove();

    return parent;
  };

  return D3CandleStickChart;
}