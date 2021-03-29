<template lang='pug'>
#chartWrapper(v-bind:class='{ clickable: !isClicked }')
  .shield(v-on:click.prevent='click')
  svg#chart(width='960', :height='height')
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
      isClicked: false
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
    click: function() {
      this.isClicked = true;
    },
    render: function() {
      console.log('inside render...');
      this.remove();
      let data = this.data.candles;
      // biance ma n = 7, 25, 99
      sma(data, 7, function(e, idx){
        if(idx>=7){
          data[idx-1]['sma_7'] = e
        }
       return e
      })
      sma(data, 25, function(e, idx){
          if(idx>=25){
            data[idx-1]['sma_25'] = e
          }
         return e
       })
      if(_.size(this.data.candles) < MIN_CANDLES) {
        drawMessage('Not enough data to spawn chart');
        return
      }
      if(!window.D3CandleStickChart){
        window.D3CandleStickChart = candleStickChart()
      }
      let candleChart = new D3CandleStickChart(document.getElementById('chart'), {width: window.innerWidth - 20, height: parseInt(this.height)})
      candleChart.loadData(this.data.candles.map(function (record) {
        record.date *= 1000;
        return record;
      }));
      candleChart.tradePoints(this.data.trades.map(function (record) {
        record.date *= 1000;
        return record;
      }))
    },
    remove: function() {
      d3.select('#chart').html('');
    }
  }
}
</script>

<style>

#chartWrapper.clickable {
  position: relative;
}

#chartWrapper.clickable .shield {
  cursor: zoom-in;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background: grey;
  opacity: 0.1;
}

#chart {
  background-color: #eee;
  width: 100%;
}

#chart circle {
  clip-path: url(#clip);
}

#chart .zoom {
  cursor: move;
  fill: none;
  pointer-events: all;
}

#chart .line {
  fill: none;
  stroke: hotpink;
  stroke-width: 1.5px;
  clip-path: url(#clip);
}

#chart .line7 {
  fill: none;
  stroke: yellow;
  stroke-width: 1.5px;
  clip-path: url(#clip);
}

/*#chart .price.line {
  stroke-width: 2.5px;
}*/

#chart circle.buy {
  fill: #03a9f4;
}

#chart circle.sell {
  fill: #fff;
}

</style>
