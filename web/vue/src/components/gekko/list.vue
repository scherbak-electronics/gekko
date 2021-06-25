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
          th exchange
          th currency
          th asset
          th status
          th USDT balance
      tbody
        tr.clickable(v-for='gekko in processes', v-on:click='$router.push({path: `/live-gekkos/${gekko.id}`})')
          td {{ gekko.config.watch.exchange }}
          td {{ gekko.config.watch.currency }}
          td {{ gekko.config.watch.asset }}
          td {{ status(gekko) }}
          td {{0.00}}
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
      return _.values(this.$store.state.gekkos).concat(_.values(this.$store.state.archivedGekkos)).filter((g) => {
        if(g.logType === 'papertrader')
          return true;

        if(g.logType === 'tradebot')
          return true;

        return false;
      });
    }
  },
  methods: {
    humanizeDuration: (n) => window.humanizeDuration(n),
    moment: mom => moment.utc(mom),
    fmt: mom => moment.utc(mom).format('YYYY-MM-DD HH:mm'),
    round: n => (+n).toFixed(3),
    timespan: function(a, b) {
      return this.humanizeDuration(this.moment(a).diff(this.moment(b)))
    },
    status: state => {
      if(state.errored)
        return 'errored';
      if(state.stopped)
        return 'stopped';
      if(state.active)
        return 'running';

      console.log('unknown state:', state);
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
