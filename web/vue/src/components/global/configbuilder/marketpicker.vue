<template lang='pug'>
div
  .mx1
    label(for='exchange').wrapper Exchange:
    .custom-select.button
      select(v-model='exchange')
        option(v-for='(market, e) in exchanges') {{ e }}
  .grd-row
    .grd-row-col-3-6.mx1
      label(for='currency') Currency:
      .custom-select.button
        select(v-model='currency')
          option(v-for='cur in currencies') {{ cur }}
    .grd-row-col-3-6.mx1
      label(for='asset') Asset:
      .custom-select.button
        select(v-model='asset')
          option(v-for='asst in assets') {{ asst }}
  div.input-checkbox.px1.py1
    input(type='checkbox' id='inverted_accumulation' v-model='inverted')
    strong inverted accumulation
</template>

<script>

import _ from 'lodash'
import rangePicker from './rangepicker.vue'
import rangeCreator from './rangecreator.vue'
import { get } from '../../../tools/ajax'

export default {
  props: ['onlyTradable', 'onlyImportable'],
  data: () => {
    return {
      // defaults:
      exchange: 'binance_simulator',
      currency: 'USDT',
      asset: 'TRX',
      inverted: false
    };
  },
  created: function() {
    this.emitConfig();
  },
  computed: {
    exchanges: function() {

      let exchanges = Object.assign({}, this.$store.state.exchanges);

      if(_.isEmpty(exchanges))
        return false;

      if(this.onlyTradable) {
        _.each(exchanges, (e, name) => {
          if(!e.tradable)
            delete exchanges[name];
        });
      }

      if(this.onlyImportable) {
        _.each(exchanges, (e, name) => {
          if(!e.importable)
            delete exchanges[name];
        });
      }

      return exchanges;
    },
    markets: function() {
      return this.exchanges ? this.exchanges[ this.exchange ] : null;
    },

    assets: function() {
      return this.exchanges ? this.exchanges[this.exchange].markets[this.currency] : null;
    },

    currencies: function() {
      return this.exchanges ? _.keys( this.exchanges[this.exchange].markets ) : null;
    },
    watchConfig: function() {
      return {
        watch: {
          exchange: this.exchange,
          currency: this.currency,
          asset: this.asset,
          inverted: this.inverted
        }
      }
    }
  },

  watch: {
    currency: function() { this.emitConfig() },
    asset: function() { this.emitConfig() },
    market: function() { this.emitConfig() },
    exchanges: function() { this.emitConfig() },
    exchange: function() { this.emitConfig() },
    inverted: function() { this.emitConfig() }
  },

  methods: {
    emitConfig: function() {
      this.$emit('market', this.watchConfig);
    }
  }
}
</script>
</style>
