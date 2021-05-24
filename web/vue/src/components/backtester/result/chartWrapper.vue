<template lang='pug'>
div
  #chartWrapper(v-bind:class='{ clickable: !isClicked }')
    .shield(v-on:click.prevent='click')
    div#lit_wg_chart_backtest
    a.btn--primary(href='#', v-on:click.prevent='changeTimeScale') Time Scale 
    a.w100--s.my1.btn--primary(href='#', v-on:click.prevent='setPriceScalePercent', v-if="1") Percent
    a.w100--s.my1.btn--primary(href='#', v-on:click.prevent='setPriceScaleNormal', v-if="1") Normal
    a.w100--s.my1.btn--primary(href='#', v-on:click.prevent='setPriceScaleLog', v-if="1") Log
    a.w100--s.my1.btn--primary(href='#', v-on:click.prevent='priceLineSnap', v-if="1") Price line snap
</template>

<script>

import _ from 'lodash'
import candleStickChart from '../../../d3/candleStickChart'
import { draw as drawMessage, clear as clearMessage } from '../../../d3/message'
import { sma } from '../../../indicators/sma';

const MIN_CANDLES = 4;

export default {
  props: ['data', 'height'],
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

  watch: {
    data: function() { this.render() },
  },

  created: function() { setTimeout( this.render, 100) },
  beforeDestroy: function() {
    this.remove();
  },

  methods: {
    priceLineSnap: function() {
      if (this.candleChartCandles) {
        this.priceLineSource = !this.priceLineSource;
        if (this.priceLineSource) {
          this.candleChartCandles.applyOptions({
            priceLineSource: LightweightCharts.PriceLineSource.LastVisible
          });
        } else {
          this.candleChartCandles.applyOptions({
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
      if (this.candleChart && this.candleChartCandles) {
        this.candleChart.removeSeries(this.candleChartCandles);
      }
    },
    render: function() {
      if(window.LightweightCharts){
        if (!this.candleChart) {
          this.candleChart = LightweightCharts.createChart('lit_wg_chart_backtest', { 
            height: this.height,
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
          
          // if ((this.data.markers && this.data.markers.length) || (this.data.trades && this.data.trades.length)) {
          //   this.candleChart.subscribeCrosshairMove(param => {
          //       //console.log(param.hoveredMarkerId);
          //   });
          //   this.candleChart.subscribeClick(param => {
          //     console.log(param);
          //     //price = series.coordinateToPrice(324);
          //     this.markerId = this.candleChartCandles.coordinateToPrice(param.point.y);
          //     let line = {
          //       price: this.markerId,
          //       color: 'green',
          //       lineWidth: 1,
          //       lineStyle: 1, // 3 - LargeDashed, 1 - Dotted, 2 - Dashed, 0 - Solid, 4 - SparseDotted
          //       axisLabelVisible: true,
          //       title: 'Buy',
          //     };
          //     this.priceLines.push(this.candleChartCandles.createPriceLine(line));
          //     this.viewParam++;
          //   });
          // }
        } 
        if (!this.candleChartCandles) {
          this.candleChartCandles = this.candleChart.addCandlestickSeries({
            upColor: '#909090',
            wickUpColor: '#909090',
            downColor: '#000000',
            wickDownColor: '#000000',
            borderVisible: true,
            borderColor: '#000000'
          });
          this.candleChartCandles.applyOptions({});
        }
        if (this.candleChart) {
          if (this.candleChartCandles && this.data.candles && this.data.candles.length) {
            this.candleChartCandles.setData(this.data.candles.map(function(candle){
              if (!candle.time) {
                candle.time = candle.date;
              }
              
              return candle;
            }));
            // if (this.data.trades) {
            //   let trades = this.data.trades.map(function(trade){
            //     trade.time = trade.date;
            //     console.log(trade);
            //     if (trade.side === 'sell') {
            //       trade.color = '#444444';
            //       trade.text = 'sell';
            //       trade.shape = 'arrowDown';
            //       trade.position = 'aboveBar';
            //     } else if (trade.side === 'buy') {
            //       trade.color = '#999999';
            //       trade.text = 'buy';
            //       trade.shape = 'arrowUp';
            //       trade.position = 'aboveBar';
            //     }
            //     return trade;
            //   });
            //   this.candleChartCandles.setMarkers(trades);
            // }
            // if (this.data.markers) {
            //   let markers = this.data.markers;
            //   this.candleChartCandles.setMarkers(markers);
            // }
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
        
            // }
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
            // if (this.data.priceLines) {
            //   this.priceLines = [];
            //   _.each(this.data.priceLines, (line) => {
            //     this.priceLines.push(this.candleChartCandles.createPriceLine(line));
            //   }, this);
            // }
          }
        }
      } else {
        console.log('unable to find lit chart');
      }
    }
  }
}
</script>

<style>
</style>
