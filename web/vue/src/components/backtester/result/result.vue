<template lang='pug'>
  div
    div.contain
      h4 Backtest result  
    chart(:data='candles', height='500')
    result-summary(:report='result.performanceReport')
    roundtripTable(:roundtrips='result.roundtrips')
</template>

<script>
import resultSummary from './summary.vue'
import chart from './chartWrapper.vue'
import roundtripTable from './roundtripTable.vue'

export default {
  props: ['result'],
  data: () => {
    return {}
  },
  methods: {},
  components: {
    roundtripTable,
    resultSummary,
    chart
  },
  computed: {
    candles: function() {
      console.log('result candles markers');
      console.log(this.result.markers);
      console.log(this.result.performanceReport);
      return {
        candles: this.result.stratCandles,
        trades: this.result.trades,
        markers: this.result.markers,
        lines: this.result.lines,
        histogram: this.result.histogram,
        area: this.result.area,
        priceLines: this.result.priceLines,
        statistics: this.result.statistics
      };
    }
  }
}
</script>

<style>
</style>
