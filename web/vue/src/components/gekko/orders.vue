<template lang='pug'>
div.spot-orders
  table.list-heading
    thead
      tr
        th.col-side side
        th.col-amount-asset amount
        th.col-amount-currency amount
        th.col-amount-filled filled
        th.col-price price
        th.col-status status
        th.col-type type
        th.col-date date
        th.col-action &nbsp;
  div.list-items-scroll
    table.list-items
      tbody
        tr(v-for='order in orders')
          td.col-side {{ order.side }}
          td.col-amount-asset {{ Number(order.amountAsset).toFixed(1) }}
          td.col-amount-currency {{ Number(order.amountCurrency).toFixed(1) }}
          td.col-amount-filled {{ Number(order.amountFilled).toFixed(1) }}
          td.col-price {{ Number(order.price).toFixed(5) }}
          td.col-status {{ order.status }}
          td.col-type {{ order.type }}
          td.col-date {{ order.date }}
          td.col-action 
            a.w100--s.btn--primary(href='#', v-if="order.status == 'FILLED' && order.side == 'BUY'" v-on:click.prevent='sell(order.id)') sell
            a.w100--s.btn--primary(href='#', v-if="order.status == 'OPEN' && order.type == 'LIMIT'" v-on:click.prevent='cancel(order.id)') cancel
</template>

<script>

import _ from 'lodash'
import Vue from 'vue'

export default {
  props: ['orders'],
  components: {
  },
  created: function() {
    this.orders = [];
  },
  mounted: function () {
    // this.$root.$on('datasets_loaded', () => {
    //   this.setIndex = this.datasets.length - 1;
    //   this.set = this.datasets[this.setIndex];
    //   this.updateCustomRange();
    //   this.emitSet(this.set);
    // });
    // this.$nextTick(function () {
    //   // Code that will run only after the
    //   // entire view has been rendered
    //   // this.showChart();
    // })
  },
  data: () => {
    return {
      // setIndex: -1,
      // customTo: false,
      // customFrom: false,
      // rangeVisible: false,
      // set: false
    };
  },
 
  methods: {
    sell: function(orderId) {
      console.log('sell ',orderId);
      this.$emit('sellOrderById', orderId);
    },
    cancel: function(orderId) {
      console.log('cancel ', orderId);
      this.$emit('cancelOrderById', orderId);
    }
  },
  watch: {
    // setIndex: function() {
    //   this.set = this.datasets[this.setIndex];
    //   this.updateCustomRange();
    //   this.emitSet(this.set);
    // },
    // customTo: function() { this.emitSet(this.set); },
    // customFrom: function() { this.emitSet(this.set); }
  }
}
</script>
<style>
table td {
    font-size: 12px;
    font-weight: bold;
}
table th {font-size: 16px;}
table td, table th {
    padding: 0;
    word-wrap: none;
    line-height: 1;
}
table.list-heading {
    width: 680px;
}
table.list-items {
    width: 680px;
}
.spot-orders .list-items-scroll {
  height:140px;
  overflow-y: scroll;                                                                     
}
.spot-orders .list-items td {
  padding:0;
  margin:0;
}
td.radio {
  width: 45px;
}
td label{
  display: inline;
  font-size: 1em;
}
.col-side {width: 49px;}
.col-amount-asset {width: 60px;}
.col-amount-currency {width: 60px;}
.col-amount-filled {width: 60px;}
.col-price {width: 71px;}
.col-status {width: 68px;}
.col-type {width: 85px;}
.col-date {width: 158px;}
.col-action {width: auto;}
</style>