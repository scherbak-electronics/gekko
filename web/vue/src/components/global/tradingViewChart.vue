<template lang='pug'>
div.trading-view-candlestick-chart  
  div#trading-view-light-chart
  a.btn--primary(href='#', v-on:click.prevent='changeTimeScale') Time
  a.w100--s.btn--primary(href='#', v-on:click.prevent='setPriceScalePercent', v-if="1") %
  a.w100--s.btn--primary(href='#', v-on:click.prevent='setPriceScaleNormal', v-if="1") Norm
  a.w100--s.btn--primary(href='#', v-on:click.prevent='setPriceScaleLog', v-if="1") Log
  a.w100--s.btn--primary(href='#', v-on:click.prevent='priceLineSnap', v-if="1") Price line snap
  a.w100--s.btn--primary(href='#', v-on:click.prevent='setTimeRange(14)') 14 days
  a.w100--s.btn--primary(href='#', v-on:click.prevent='setTimeRange(30)') 30 days
  a.w100--s.btn--primary(href='#', v-on:click.prevent='setTimeRange(130)') 130 days
  a.w100--s.btn--primary(href='#', v-on:click.prevent='setCandleSize(1)') 1 m
  a.w100--s.btn--primary(href='#', v-on:click.prevent='setCandleSize(4)') 4 m
  a.w100--s.btn--primary(href='#', v-on:click.prevent='setCandleSize(10)') 10 m
  a.w100--s.btn--primary(href='#', v-on:click.prevent='setCandleSize(30)') 30 m
  a.w100--s.btn--primary(href='#', v-on:click.prevent='setCandleSize(60)') 60 m
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
      markerId: ''
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
          if (order.side === 'SELL') {
            order.color = '#cf8d23';
            order.text = Number(order.amountAsset).toFixed(0);
            order.shape = 'circle';
            order.size = 3;
            order.position = 'inBar';
            
          } else if (order.side === 'BUY') {
            order.color = '#198519';
            order.text = Number(order.amountAsset).toFixed(0);
            order.shape = 'circle';
            order.size = 2;
            order.position = 'inBar';
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
        _.each(levels, (level) => {
          let color = 'black';
          if (level.color) {
            color = level.color;
          }
          this.priceLevelsLines.push(this.candlestickSeries.createPriceLine({
            price: level.price,
            color: color,
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
