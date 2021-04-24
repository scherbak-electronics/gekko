<template lang='pug'>
  section.contain
    .grd-row 
      .grd-row-col-3-6.txt--left
        h3 Dev tools
        p click to see info at the left column
        a.w100--s.my1.btn--primary(href='#', v-on:click.prevent='seeInfo', v-if="1") See info
        a.w100--s.my1.btn--primary(href='#', v-on:click.prevent='yesNoApi', v-if="1") Alternative teasting feature YES/NO api request
    .grd-row
      .grd-row-col-3-6(v-html='contentOut')
      .grd-row-col-3-6.txt--left
        p click this button to see this message at the left column and bottom micro output line
        a.w100--s.my1.btn--primary(href='#', v-on:click.prevent='start', v-if="1") Start test
        p general post testing button to make a simple post request
        a.w100--s.my1.btn--primary(href='#', v-on:click.prevent='getDevinfoData', v-if="1") Make POST
    
    .grd-row 
      .grd-row-col-3-6.txt--left
        p {{ microOut }}
        p SEKO - Scherbak Electronics Gekko   
        div#lit_wg_chart  
</template>

<script>

import _ from 'lodash'

import { post } from '../../tools/ajax'
import superagent from 'superagent'
import noCache from 'superagent-no-cache'
import marked from '../../tools/marked';

const lefttmp = marked(`

## SEKO

SEKO developers section!

`);

export default {
  created: function() {
    console.log('created call..');
    this.contentOut = 'Created call... ..';
  },
  mounted: function () {
    this.$nextTick(function () {
      // Code that will run only after the
      // entire view has been rendered
      console.log('mounted call..');
      this.contentOut = 'mounted call... ..';
      this.showChart();
    })
  },
  data: function () {
    return {
      contentOut: 'content empty...',
      microOut: 'none..'
    };
  },
  methods: {
    showChart: function() {
      if(window.LightweightCharts){
       
     
        const chart = LightweightCharts.createChart('lit_wg_chart', { width: 400, height: 300 });
        const lineSeries = chart.addLineSeries();
        lineSeries.setData([
          { time: '2019-04-11', value: 80.01 },
          { time: '2019-04-12', value: 96.63 },
          { time: '2019-04-13', value: 76.64 },
          { time: '2019-04-14', value: 81.89 },
          { time: '2019-04-15', value: 74.43 },
          { time: '2019-04-16', value: 80.01 },
          { time: '2019-04-17', value: 96.63 },
          { time: '2019-04-18', value: 76.64 },
          { time: '2019-04-19', value: 81.89 },
          { time: '2019-04-20', value: 74.43 },
        ]);
        const lineSeries2 = chart.addLineSeries();
        lineSeries2.setData([
            { time: '2019-04-11', value: 30.01 },
            { time: '2019-04-12', value: 26.63 },
            { time: '2019-04-13', value: 16.64 },
            { time: '2019-04-14', value: 11.89 },
            { time: '2019-04-15', value: 14.43 },
            { time: '2019-04-16', value: 10.01 },
            { time: '2019-04-17', value: 26.63 },
            { time: '2019-04-18', value: 26.64 },
            { time: '2019-04-19', value: 31.89 },
            { time: '2019-04-20', value: 44.43 },
        ]);
      } else {
        this.contentOut = 'Sprry, no chart.... ..';
      }
    },
    yesNoApi: function() {
      this.contentOut = 'getting YES/NO ..';
      superagent.get('https://yesno.wtf/api').use(noCache).end((err, res) => {
        this.contentOut = JSON.stringify(res);
      });
    },
    seeInfo: function() {
      this.contentOut = lefttmp;
    },
    start: function() {
      this.contentOut = 'Start btn click!';
      this.microOut = 'Start btn click!';
    },
    getDevinfoData: function() {
      if(this.isLoading) {
        return;
      }
      let config = {};
      post('devinfo', config, (err, res) => {
        this.microOut = 'post response...';
        this.contentOut = JSON.stringify(res);
      }); 
    }
  },
  computed: {
    devinfo: function() {
      return _.values(this.$store.state.devinfo);
    }
  }
}
</script>
