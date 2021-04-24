<template lang='pug'>
div.contain
  #chartWrapper(v-bind:class='{ clickable: !isClicked }')
    .shield(v-on:click.prevent='click')
    div#lit_wg_chart_backtest
    a.w100--s.my1.btn--primary(href='#', v-on:click.prevent='changePriceScale', v-if="1") Price Scale
    a.btn--primary(href='#', v-on:click.prevent='changeTimeScale') Time Scale 
</template>

<script>

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
      priceScaleView: 2
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
    changePriceScale: function() {
      if (this.candleChart) {
        if (this.priceScaleView > 3) {
          this.priceScaleView = 0;
        } else {
          this.priceScaleView++;
        }
        if (this.priceScaleView >= 0 && this.priceScaleView <= 3) {
          this.candleChart.applyOptions({
            priceScale: {
              mode: this.priceScaleView
            }
          });
        } 
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
          this.candleChart = LightweightCharts.createChart('lit_wg_chart_backtest', { height: 500 });
          this.candleChart.applyOptions({
              priceScale: {
                  mode: 2
              },
              timeScale: {
                timeVisible: true
              }
          });
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
        }
        if (this.candleChart) {
          if (this.candleChartCandles) {
            this.candleChartCandles.setData(this.data.candles.map(function(candle){
              candle.time = candle.date;
              return candle;
            }));
            let trades = this.data.trades.map(function(trade){
              trade.time = trade.date;
              console.log(trade);
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
            this.candleChartCandles.setMarkers(trades);
            let markers = this.data.markers;
            this.candleChartCandles.setMarkers(markers);
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
