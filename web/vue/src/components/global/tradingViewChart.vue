<template lang='pug'>
div.trading-view-candlestick-chart  
  div#trading-view-light-chart
  a.btn--primary(href='#', v-on:click.prevent='changeTimeScale') Time
  a.w100--s.btn--primary(href='#', v-on:click.prevent='setPriceScalePercent', v-if="1") %
  a.w100--s.btn--primary(href='#', v-on:click.prevent='setPriceScaleNormal', v-if="1") Norm
  a.w100--s.btn--primary(href='#', v-on:click.prevent='setPriceScaleLog', v-if="1") Log
  a.w100--s.btn--primary(href='#', v-on:click.prevent='priceLineSnap', v-if="1") Price line snap
</template>

<script>

import _ from 'lodash'
import Vue from 'vue'
export const bus = new Vue();

const MIN_CANDLES = 4;

export default {
  props: ['data', 'height', 'width', 'priceLevels', 'spotOrders'],
  data: function() {
    return {
      isClicked: false,
      timeScaleView: 1,
      priceScaleView: 2,
      priceLineSource: false,
      viewParam: 0,
      markerId: ''
    }
  },
  mounted: function () {
    bus.$on('setPriceLevels', (priceLevels) => {
      //console.log('setPriceLevels');
      this.setPriceLevels(priceLevels);
    });
    this.$nextTick(function () {
      // Code that will run only after the
      // entire view has been rendered
      // this.showChart();
    })
  },
  watch: {
    data: function() { 
      this.setCandlestickSeriesData(this.data.candles); 
      this.setTradesToMarkers(this.data.trades);
    },
    priceLevels: function(priceLevels) {
      this.setPriceLevels(priceLevels);
    },
    spotOrders: function(orders) {
      this.setSpotOrderMarkers(orders);
    }
  },
  created: function() { 
    console.log('created: function() ');
    setTimeout( this.createCandleChart, 100); 
  },
  beforeDestroy: function() {
    this.remove();
  },

  methods: {
    createCandleChart: function() {
      if(window.LightweightCharts){
        if (!this.candleChart) {
          this.candleChart = LightweightCharts.createChart('trading-view-light-chart', { 
            height: this.height,
            width: this.width,
            localization: {
              priceFormatter: (price) => {
                price = Number(price.toFixed(4));
                return price;
              }
            }, 
          });
          this.candleChart.applyOptions({
              priceScale: {
                  mode: LightweightCharts.PriceScaleMode.Percentage
              },
              timeScale: {
                timeVisible: true
              }
          });
        } 
        if (!this.candlestickSeries) {
          this.candlestickSeries = this.candleChart.addCandlestickSeries({
            upColor: '#909090',
            wickUpColor: '#909090',
            downColor: '#000000',
            wickDownColor: '#000000',
            borderVisible: true,
            borderColor: '#000000'
          });
        }
      } else {
        console.log('unable to find lit chart');
      }
    },
    priceLineSnap: function() {
      if (this.candlestickSeries) {
        this.priceLineSource = !this.priceLineSource;
        if (this.priceLineSource) {
          this.candlestickSeries.applyOptions({
            priceLineSource: LightweightCharts.PriceLineSource.LastVisible
          });
        } else {
          this.candlestickSeries.applyOptions({
            priceLineSource: LightweightCharts.PriceLineSource.LastBar
          });
        }
      }
    },
    setPriceScalePercent: function() {
      if (this.candleChart) {
        this.candleChart.applyOptions({
          priceScale: {
            mode: LightweightCharts.PriceScaleMode.Percentage
          }
        });
      }
    },
    setPriceScaleNormal: function() {
      if (this.candleChart) {
        this.candleChart.applyOptions({
          priceScale: {
            mode: LightweightCharts.PriceScaleMode.Normal
          }
        });
      }
    },
    setPriceScaleLog: function() {
      if (this.candleChart) {
        this.candleChart.applyOptions({
          priceScale: {
            mode: LightweightCharts.PriceScaleMode.Logarithmic
          }
        });
      }
    },
    changeTimeScale: function() {
      if (this.candleChart) {
        if (this.timeScaleView > 1) {
          this.timeScaleView = 0;
        } else {
          this.timeScaleView++;
        }
        if (this.timeScaleView == 1) {
          this.candleChart.applyOptions({
            timeScale: {
              timeVisible: true
            }
          });
        } else if (this.timeScaleView == 0) {
          this.candleChart.applyOptions({
            timeScale: {
              timeVisible: false
            }
          });
        } 
      }
    },
    click: function() {
      this.isClicked = true;
    },
    remove: function() {
      if (this.candleChart && this.candlestickSeries) {
        this.candleChart.removeSeries(this.candlestickSeries);
      }
    },
    setTradesToMarkers: function(trades) {
      if (trades && trades.length) {
        let markers = trades.map(function(trade){
          trade.time = trade.date;
          //console.log(trade);
          if (trade.side === 'sell') {
            trade.color = '#444444';
            trade.text = 'sell';
            trade.shape = 'arrowDown';
            trade.position = 'aboveBar';
          } else if (trade.side === 'buy') {
            trade.color = '#999999';
            trade.text = 'buy';
            trade.shape = 'arrowUp';
            trade.position = 'aboveBar';
          }
          return trade;
        });
        this.candlestickSeries.setMarkers(markers);
      }
    },
    setCandlestickSeriesData: function(data) {
      if (this.candleChart) {
        if (this.candlestickSeries && data && data.length) {
          this.candlestickSeries.setData(data.map(function(candle) {
            if (!candle.time) {
              candle.time = candle.date;
            }
            return candle;
          }));  
        }
      }
    },
    setSpotOrderMarkers: function(orderMarkers) {
      console.log('setSpotOrderMarkers ', orderMarkers);
      if (orderMarkers && orderMarkers.length) {
        this.candlestickSeries.setMarkers(orderMarkers);
      }
    },
    setPriceLevels: function(levels) {
      //console.log('setPriceLevels');
      this.removePriceLevels();
      if (levels && levels.length) {
        this.priceLevelsLines = [];
        _.each(levels, (level) => {
          this.priceLevelsLines.push(this.candlestickSeries.createPriceLine({
            price: level,
            color: 'black',
            lineWidth: 1,
            lineStyle: 3, // 3 - LargeDashed, 1 - Dotted, 2 - Dashed, 0 - Solid, 4 - SparseDotted
            axisLabelVisible: true,
            title: '',
          }));
        });
      }
    },
    removePriceLevels: function() {
      //console.log(this.priceLevelsLines);
      if (this.priceLevelsLines && this.priceLevelsLines.length) {
        _.each(this.priceLevelsLines, (level) => { 
          this.candlestickSeries.removePriceLine(level);
        });
      }
    },
    setLineSeriesData: function(lineSeries) {
      // if (this.data.lines) {
      //   this.lineSeries = this.candleChart.addLineSeries({
      //     color: '#f48fb1',
      //     lineStyle: 0,
      //     lineWidth: 1,
      //     crosshairMarkerVisible: true,
      //     crosshairMarkerRadius: 6,
      //     crosshairMarkerBorderColor: '#ffffff',
      //     crosshairMarkerBackgroundColor: '#2296f3',
      //     lineType: 1,
      //   });
      //   this.lineSeries.setData(this.data.lines);
      // }
      // if (this.data.histogram) {
    },
    setAreaSeries: function(areaData) {
      // if (this.data.area) {
      //   if (!this.areaSeries) {
      //     this.areaSeries = this.candleChart.addAreaSeries({
      //     topColor: 'rgba(120, 120, 120, 0.4)',
      //     bottomColor: 'rgba(200, 200, 200, 0)',
      //     lineColor: 'rgba(0, 0, 0, 0.7)',
      //     lineStyle: LightweightCharts.LineStyle.SparseDotted,
      //     lineWidth: 4,
      //     crosshairMarkerVisible: true,
      //     crosshairMarkerRadius: 10,
      //     crosshairMarkerBorderColor: 'rgb(199, 182, 26, 0.7)',
      //     crosshairMarkerBackgroundColor: 'rgb(0, 0, 0, 0.7)',
      //   });
      //   this.areaSeries.setData(this.data.area);
      //   }
      // }
    },
    render: function() {}
  }
}
</script>

<style>
.trading-view-candlestick-chart .btn--primary {
  background-color: #000;
  font-size: 0.7em;
}
.trading-view-candlestick-chart .btn--primary:hover {
  background-color: #404040;
}
.trading-view-candlestick-chart .btn--primary:active,
.trading-view-candlestick-chart .btn--primary:focus {
  background-color: #404040;
}

.trading-view-candlestick-chart .btn--primary:active {
  transform: translateY(1px);
}
</style>
