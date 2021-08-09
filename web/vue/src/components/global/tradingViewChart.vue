<template lang='pug'>
div.trading-view-candlestick-chart  
  div
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setCandleSize(1)') 1 m
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setCandleSize(2)') 2 m
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setCandleSize(3)') 3 m
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setCandleSize(5)') 5 m
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setCandleSize(10)') 10 m
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setCandleSize(15)') 15 m
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setCandleSize(30)') 30 m
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setCandleSize(60)') 1 h
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setCandleSize(60 * 2)') 2 h
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setCandleSize(60 * 4)') 4 h
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setCandleSize(60 * 8)') 8 h
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setCandleSize(60 * 12)') 12 h
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setCandleSize(60 * 24)') 1 day
  div
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setTimeRange(1)') 1 day
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setTimeRange(3)') 3 days
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setTimeRange(5)') 5 days
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setTimeRange(7)') 7 days
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setTimeRange(14)') 14 days
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setTimeRange(30)') 30 days
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setTimeRange(90)') 90 days
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setTimeRange(180)') 180 days
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setTimeRange(360)') 360 days
    a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setTimeRange(365 * 2)') 2 y
  div#trading-view-light-chart
  a.btn--primary-m(href='#', v-on:click.prevent='changeTimeScale') time
  a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setPriceScalePercent', v-if="1") %
  a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setPriceScaleNormal', v-if="1") Norm
  a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setPriceScaleLog', v-if="1") Log
  a.w100--s.btn--primary-m(href='#', v-on:click.prevent='setPriceLineVisible') Price line
  a.w100--s.btn--primary-m(href='#', v-on:click.prevent='togglePriceLevels') price steps
  a.w100--s.btn--primary-m(href='#', v-on:click.prevent='toggleBaseLine') base line
</template>

<script>

import _ from 'lodash'
import Vue from 'vue'
import moment from 'moment';
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
      priceLineVisible: true,
      viewParam: 0,
      markerId: '',
      priceStepsVisible: true,
      lastCheckPriceLineVisible: true,
      priceLinesData: [],
      baseLineVisible: true
    }
  },
  mounted: function () {
    // bus.$on('setPriceLevels', (priceLevels) => {
    //   //console.log('setPriceLevels');
    //   this.setPriceLevels(priceLevels);
    // });
    this.$nextTick(function () {
      // Code that will run only after the
      // entire view has been rendered
      // this.showChart();
    })
  },
  watch: {
    data: function() { 
      this.setCandlestickSeriesData(this.data.candles); 
    },
    priceLevels: function(priceLevels) {
      this.setPriceLevels(priceLevels);
    },
    spotOrders: function(orders) {
      this.setOrders(orders);
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
    toggleBaseLine: function() {
      this.baseLineVisible = !this.baseLineVisible;
      if (this.candlestickSeries) {
        this.candlestickSeries.applyOptions({
          baseLineVisible: this.baseLineVisible
        });
      }
    },
    setTimeRange: function(value) {
      this.$emit('changeTimeRange', value);
    },
    setCandleSize: function(value) {
      this.$emit('changeCandleSize', value);
    },
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
    setPriceLineVisible: function() {
      if (this.candlestickSeries) {
        this.priceLineVisible = !this.priceLineVisible;
        this.candlestickSeries.applyOptions({
          priceLineVisible: this.priceLineVisible
        });
      }
    },
    setPriceLineSource: function() {
      if (this.candlestickSeries) {
        this.priceLineSource = !this.priceLineSource;
        if (this.priceLineSource) {
          this.candlestickSeries.applyOptions({
            priceLineSource: PriceLineSource.LastBar
          });
        } else {
          this.candlestickSeries.applyOptions({
            priceLineSource: PriceLineSource.LastVisible
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
    setOrders: function(orders) {
      console.log('set orders ', orders.length);
      if (orders && orders.length) {
        _.each(orders, (order, index) => {
          order.time = moment(order.time).unix();
          order.text = Number(order.amountAsset).toFixed(0);
          order.shape = 'circle';
          order.position = 'inBar';
          if (order.side === 'SELL') {
            if (order.isEnabled) {
              order.color = '#cf8d23';
            } else {
              order.color = '#c9c9c9';
            }
            order.size = 3;
          } else if (order.side === 'BUY') {
            if (order.isEnabled) {
              order.color = '#198519';
            } else {
              order.color = '#878787';
            }
            order.size = 2;  
          }
          orders[index] = order;
        });
        this.candlestickSeries.setMarkers(orders);
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
    
    setPriceLevels: function(levels) {
      //console.log('setPriceLevels');
      this.removePriceLevels();
      if (levels && levels.length) {
        this.priceLevelsLines = [];
        this.priceLinesData = [];
        this.priceStepsVisible = true;
        _.each(levels, (level) => {
          let color = '#000000';
          let title = '';
          let lineStyle = 3; // 3 - LargeDashed, 1 - Dotted, 2 - Dashed, 0 - Solid, 4 - SparseDotted
          let axisLabelVisible = true;
          let lineWidth = 1;
          if (level.color) {
            color = level.color;
          }
          if (level.title) {
            title = level.title;
          }
          if (level.lineStyle !== undefined) {
            lineStyle = level.lineStyle;
          }
          if (level.axisLabelVisible !== undefined) {
            axisLabelVisible = level.axisLabelVisible;
          }
          if (level.lineWidth) {
            lineWidth = level.lineWidth;
          }
          let priceLine = {
            price: level.price,
            color: color,
            lineWidth: lineWidth,
            lineStyle: lineStyle, 
            axisLabelVisible: axisLabelVisible,
            title: title,
          };
          if (this.priceStepsVisible && this.candlestickSeries) {
            this.priceLevelsLines.push(this.candlestickSeries.createPriceLine(priceLine));
          }
          this.priceLinesData.push(priceLine);
        });
      }
    },
    showPriceLevels: function() {
      if (this.priceLinesData && this.priceLinesData.length) {
        _.each(this.priceLinesData, (level) => {
          this.priceLevelsLines.push(this.candlestickSeries.createPriceLine(level));
        });
      }
    },
    togglePriceLevels: function() {
      if (this.priceLinesData && this.priceLinesData.length) {
        this.priceStepsVisible = !this.priceStepsVisible;
        this.removePriceLevels();
        if (this.priceStepsVisible) {
          this.showPriceLevels();
        }
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
.tv-lightweight-charts {
    border-radius: 10px;
    box-shadow: 10px 6px 76px rgb(50 50 50 / 47%), 0 0 34px rgb(0 0 0 / 0%);
}
.trading-view-candlestick-chart .btn--primary-m:focus,
.trading-view-candlestick-chart .btn--primary-m {
  background-color: #ffffff;
  color: #000;
    margin-right: 6px;
    border-radius: 4px;
    font-size: .6em;
    height: 16px;
    line-height: 15px;
    padding-top: 0px;
    padding-right: 6px;
    width: auto;
    padding-left: 6px;
}
.trading-view-candlestick-chart .btn--primary-m:active, 
.trading-view-candlestick-chart .btn--primary-m:hover {
  background-color: #000000;
  color: #ffffff;
}

</style>
