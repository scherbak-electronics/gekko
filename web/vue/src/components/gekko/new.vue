<template lang='pug'>
  div.contain
    .grd.contain
      .grd-row
        .grd-row-col-6-6.mx1
          div.px1
            a.w100--s.my1.btn--primary(href='#', v-on:click.prevent='start', v-if="!pendingStratrunner") Start
    gekko-config-builder(v-on:config='updateConfig')
    .txt--center(v-if='config.valid')
      spinner(v-if='pendingStratrunner')
</template>

<script>

import _ from 'lodash'
import Vue from 'vue'
import { post } from '../../tools/ajax'
import gekkoConfigBuilder from './gekkoConfigBuilder.vue'
import spinner from '../global/blockSpinner.vue'

export default {
  components: {
    gekkoConfigBuilder,
    spinner
  },
  data: () => {
    return {
      pendingStratrunner: false,
      config: {}
    }
  },
  computed: {
    gekkos: function() {
      return this.$store.state.gekkos;
    },
    gekkoConfig: function() {
      var startAt;
      startAt = moment().utc().startOf('minute').format();
      const gekkoConfig = Vue.util.extend({
        market: {
          type: 'realtime',
          from: startAt
        },
        mode: 'realtime',
        type: 'tradebot'
      }, this.config);
      this.config.type = 'tradebot';
      return gekkoConfig;
    },
    existingMarketWatcher: function() {
      const market = Vue.util.extend({}, this.watchConfig.watch);
      return _.find(this.gekkos, {config: {watch: market}});
    },
    exchange: function() {
      return this.watchConfig.watch.exchange;
    },
    currency: function() {
      return this.watchConfig.watch.currency;
    },
    asset: function() {
      return this.watchConfig.watch.asset;
    },
    existingTradebot: function() {
      return _.find(this.gekkos, (seco) => {
        console.log(seco);
        if (this.asset === seco.config.watch.asset) {
          if (this.currency === seco.config.watch.currency) {
            if (this.exchange === seco.config.watch.exchange) {
              return true;
            }
          }
        }   
      });
    },
    availableApiKeys: function() {
      return this.$store.state.apiKeys;
    }
  },
  watch: {
  },
  methods: {
    updateConfig: function(config) {
      this.config = config;
    },
    start: function() {
      this.startGekko(this.routeToGekko);
    },
    routeToGekko: function(err, resp) {
      if (err || resp.error) {
        return console.error(err, resp.error);
      }
      this.$router.push({
        path: `/live-gekkos/${resp.id}`
      });
    },
    startGekko: function(next) {
      post('startGekko', this.gekkoConfig, next);
    }
  }
}
</script>

<style>
</style>
