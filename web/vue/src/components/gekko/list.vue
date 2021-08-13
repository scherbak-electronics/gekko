<template lang='pug'>
  .contain
    div
      router-link.btn--primary(to='/live-gekkos/new') New
    h5 trading processes
    .text(v-if='!processes.length')
      p You don't have any processes.
    table.full(v-if='processes.length')
      thead
        tr
          th asset
          th currency
          th exchange
          th asset $
          th orders profit $
          th status
      tbody
        tr.clickable(v-for='gekko in processes', v-on:click='$router.push({path: `/live-gekkos/${gekko.id}`})')
          td {{ gekko.config.watch.asset }}
          td {{ gekko.config.watch.currency }}
          td {{ gekko.config.watch.exchange }}
          td {{ getAssetBalanceCurrency(gekko) }}
          td {{ getOrdersProfitCurrency(gekko) }}
          td {{ getTradingStatus(gekko) }}
</template>

<script>
// global moment
// global humanizeDuration

export default {
  created: function() {
    this.timer = setInterval(() => {
      this.now = moment();
    }, 1000)
  },
  destroyed: function() {
    clearTimeout(this.timer);
  },
  data: () => {
    return {
      timer: false,
      now: moment()
    }
  },
  computed: {
    processes: function() {
      return _.values(this.$store.state.gekkos);
    }
  },
  methods: {
    getAssetBalanceCurrency: function(process) {
      if (process.balances.assetBalance.amount && process.ticker.bid) {
        return Number(process.balances.assetBalance.amount * process.ticker.bid).toFixed(2);
      }
      return 0;
    },
    getOrdersProfitCurrency: function(process) {
      if (process.balances.ordersTotalCurrencyProfit) {
        return Number(process.balances.ordersTotalCurrencyProfit).toFixed(2);
      }
      return 0;
    },
    getTradingStatus: function(process) {
      let status = '';
      if (process.settings && process.settings.tradingEnabled) {
        status += 'trading';
        if (process.settings.realOrdersEnabled) {
          status += ', real orders';
          if (process.settings.sellOnlyMode) {
            status += ', sell only';
          } else if (process.settings.buyOnlyIfGoesDownMode) {
            status += ', buy if down';
          }
        }
      }
      return status;
    },
    humanizeDuration: (n) => window.humanizeDuration(n),
    moment: mom => moment.utc(mom),
    fmt: mom => moment.utc(mom).format('YYYY-MM-DD HH:mm'),
    round: n => (+n).toFixed(3),
    timespan: function(a, b) {
      return this.humanizeDuration(this.moment(a).diff(this.moment(b)))
    }
  }
}
</script>

<style>
table.clickable {
  border-collapse: separate;
}

tr.clickable td:nth-child(1) {
  padding-left: 5px;
}

tr.clickable {
  cursor: pointer;
}
tr.clickable:hover {
  background: rgba(216,216,216,.99);
}
</style>
