<template lang='pug'>
.grd.contain
  .grd-row
    .grd-row-col-3-6.mx1
      market-picker(v-on:market='updateMarketConfig', :only-tradable='isTradebot')
    .grd-row-col-3-6.mx1
      type-picker(v-on:type='updateType')
  template(v-if='type !== "market watcher"')
</template>

<script>

import marketPicker from '../global/configbuilder/marketpicker.vue'
import typePicker from '../global/configbuilder/typepicker.vue'
import { get } from '../../tools/ajax'
import _ from 'lodash'

export default {

  created: function() {
    get('configPart/candleWriter', (error, response) => {
      this.candleWriter = toml.parse(response.part);
    });
  },
  data: () => {
    return {
      market: {},
      range: {},
      type: '',
      candleWriter: {}
    }
  },
  components: {
    marketPicker
  },
  computed: {
    isTradebot: function() {
      return this.type === 'tradebot';
    },
    config: function() {
      let config = {};
      Object.assign(config, this.market,
        { candleWriter: this.candleWriter },
        { type: this.type }
      );
      config.trader = { enabled: true }
      config.valid = this.validConfig(config);
      return config;
    }
  },
  methods: {
    validConfig: config => {
      if(_.isNaN(config.candleSize)) {
        return false;
      } else if (config.candleSize == 0) {
        return false;
      }
      return true;
    },
    updateMarketConfig: function(mc) {
      this.market = mc;
      this.emitConfig();
      //console.log('this.market: ', this.market);
    },
    updateType: function(type) {
      this.type = type;
      this.emitConfig();
    },
    emitConfig: function() {
      //console.log(this.config);
      this.$emit('config', this.config); 
    }
  }
}
</script>

<style>

</style>
