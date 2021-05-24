<template lang='pug'>
div
  .txt--center.my2(v-if='datasetScanstate === "idle"')
    a.w100--s.btn--primary.scan-btn(href='#', v-on:click.prevent='scan') Scan available data
  .txt--center.my2(v-if='datasetScanstate === "scanning"')
    spinner
  .my2(v-if='datasetScanstate === "scanned"')
    div(v-if='datasets.length != 0')
      table.full
        thead
          tr
            th 
            th exchange
            th currency
            th asset
            th from
            th to
            th duration
        tbody
          tr(v-for='(set, i) in datasets')
            td.radio
              input(type='radio', name='dataset', :value='i', v-model='setIndex', v-bind:id='set.id')
            td 
              label(v-bind:for='set.id') {{ set.exchange }}
            td 
              label(v-bind:for='set.id') {{ set.currency }}
            td
              label(v-bind:for='set.id') {{ set.asset }}
            td 
              label(v-bind:for='set.id') {{ fmt(set.from) }}
            td 
              label(v-bind:for='set.id') {{ fmt(set.to) }}
            td
              label(v-bind:for='set.id') {{ humanizeDuration(set.to.diff(set.from)) }}
      div#lit_wg_chart 
      a.w100--s.my1.btn--primary(href='#', v-on:click.prevent='loadChartData', v-if="1") Load
      a.w100--s.my1.btn--primary(href='#', v-on:click.prevent='clearChart', v-if="1") Clear
      a.w100--s.my1.btn--primary(href='#', v-on:click.prevent='chartFitToContent', v-if="1") Fit
      a.btn--primary(href='#', v-on:click.prevent='openRange', v-if='!rangeVisible') Adjust range
      template(v-if='rangeVisible')
        div
          label(for='customFrom') From:
          input(v-model='customFrom')
        div
          label(for='customTo') To:
          input(v-model='customTo')

    em(v-else) No Data found 
      a(href='#/data/importer') Lets add some

</template>

<script>

import _ from 'lodash'
import Vue from 'vue'

import { post } from '../../../tools/ajax'
import spinner from '../../global/blockSpinner.vue'
import dataset from '../../global/mixins/dataset'

export default {
  components: {
    spinner
  },
  created: function() {
    this.scan();
  },
  mounted: function () {
    this.$root.$on('datasets_loaded', () => {
      this.setIndex = this.datasets.length - 1;
      this.set = this.datasets[this.setIndex];
      this.updateCustomRange();
      this.emitSet(this.set);
    });
    this.$nextTick(function () {
      // Code that will run only after the
      // entire view has been rendered
      // this.showChart();
    })
  },
  data: () => {
    return {
      setIndex: -1,
      customTo: false,
      customFrom: false,
      rangeVisible: false,
      set: false
    };
  },
  mixins: [ dataset ],
  methods: {
    clearChart: function() {
      if (this.datasetChart && this.dsChartCandlestickSeries) {
        let data = [];
        this.dsChartCandlestickSeries.setData(data);
      }
    },
    chartFitToContent: function() {
      if (this.datasetChart) {
        this.datasetChart.timeScale().fitContent();
      }
    },
    loadCandles: function(data) {
      if(window.LightweightCharts){
        if (!this.datasetChart) {
          this.datasetChart = LightweightCharts.createChart('lit_wg_chart', { height: 300 });
        }
        if (!this.dsChartCandlestickSeries) {
          this.dsChartCandlestickSeries = this.datasetChart.addCandlestickSeries({
            upColor: '#5a95fa',
            downColor: '#2f3030',
            borderVisible: false,
            wickVisible: true,
            borderColor: '#000000',
            wickColor: '#000000',
            borderUpColor: '#4682B4',
            borderDownColor: '#A52A2A',
            wickUpColor: '#4682B4',
            wickDownColor: '#A52A2A',
          });
        }
        if (this.dsChartCandlestickSeries) {
          this.dsChartCandlestickSeries.setData(data);
        }
        this.chartFitToContent();
      } else {
        console.log('unable to find lit chart');
      }
    },
    loadChartData: function(config) {
      if (this.set) {
        if(this.isLoading) {
          return;
        }
        if(this.candleFetch === 'fetching') {
          return;
        }
        this.candleFetch = 'fetching';

        let to = this.set.to;
        let from = this.set.from;
        let candleSize = 1;
        let config = {
          watch: {
            exchange: this.set.exchange, 
            currency: this.set.currency, 
            asset: this.set.asset
          },
          daterange: {
            to, from
          },
          candleSize
        };

        // We timeout because of 2 reasons:
        // - In case we get a batch of candles we only fetch once
        // - This way we give the db (mostly sqlite) some time to write
        //   the result before we query it.
        setTimeout(() => {
          post('getCandles', config, (err, res) => {
            this.candleFetch = 'fetched';
            if(!res || res.error || !_.isArray(res))
              return console.log(res);

            this.candles = res.map(c => {
              console.log('post response.. in single gekko');
              console.log(c.start);
              c.date = c.start;
              c.time = c.date;
              //c.start = moment.unix(c.start).utc().format();
              return c;
            });
            this.loadCandles(this.candles);
          })
        }, _.random(150, 2500));
        
        this.$emit('dataset', this.set);
      }
    },
    humanizeDuration: (n) => {
      return window.humanizeDuration(n, {largest: 4});
    },
    fmt: mom => mom.utc().format('YYYY-MM-DD HH:mm'),
    openRange: function() {
      if(this.setIndex === -1)
        return alert('Select a dataset to adjust range');

      this.updateCustomRange();

      this.rangeVisible = true;
    },
    updateCustomRange: function() {
      this.customTo = this.fmt(this.set.to);
      this.customFrom = this.fmt(this.set.from);
    },
    emitSet: function(val) {
      if(!val)
        return;

      let set;

      if(!this.customTo)
        set = val;
      else {
        set = Vue.util.extend({}, val);
        set.to = moment.utc(this.customTo, 'YYYY-MM-DD HH:mm').format();
        set.from = moment.utc(this.customFrom, 'YYYY-MM-DD HH:mm').format();
      }

      this.$emit('dataset', set);
      console.log('emit set...');
    }
  },
  watch: {

    setIndex: function() {
      this.set = this.datasets[this.setIndex];
      this.updateCustomRange();
      this.emitSet(this.set);
    },

    customTo: function() { this.emitSet(this.set); },
    customFrom: function() { this.emitSet(this.set); }
  }
}
</script>
<style>
td.radio {
  width: 45px;
}
td label{
  display: inline;
  font-size: 1em;
}
</style>