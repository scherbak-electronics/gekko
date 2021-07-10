<template lang='pug'>
.spot-orders
  .list-items-scroll
    table.list-items
      thead
        tr
          th.col-date date
          th.col-side side
          th.col-amount-asset amount
          th.col-amount-currency amount
          th.col-amount-filled filled
          th.col-price price
          th.col-status status
          th.col-type type
          th.col-sell-id sell id
          th.col-enabled enabled
          th.col-action action
          th.col-action action
      tbody
        tr(v-bind:class="{'order-disabled': !order.isEnabled, 'order-closed': order.sellId}" v-for='order in orders')
          td.col-date {{ order.readableTime }}
          td.col-side {{ order.side }}
          td.col-amount-asset {{ Number(order.amountAsset).toFixed(1) }}
          td.col-amount-currency {{ Number(order.amountCurrency).toFixed(1) }}
          td.col-amount-filled {{ Number(order.amountFilled).toFixed(1) }}
          td.col-price {{ Number(order.price).toFixed(5) }}
          td.col-status {{order.status}}
          td.col-type {{order.type}}
          td.col-sell-id(v-if='order.sellId') {{ order.sellId }}
          td.col-sell-id(v-if='!order.sellId') open
          td.col-enabled
            span(v-if='order.isEnabled') yes
            span(v-if='!order.isEnabled') no
          td.col-action
            a.w100--s.btn--primary(href='#', v-if='order.status == "FILLED" && order.side == "BUY" && order.isEnabled',v-on:click.prevent='sell(order.id)') sell
            a.w100--s.btn--primary(href='#', v-if='order.status == "OPEN" && order.type == "LIMIT" && order.isEnabled',v-on:click.prevent='cancel(order.id)') cancel
          td.col-action
            a.w100--s.btn--primary(href='#', v-if='order.isEnabled',v-on:click.prevent='disableOrder(order.id)') disable 
            a.w100--s.btn--primary(href='#', v-if='!order.isEnabled',v-on:click.prevent='enableOrder(order.id)') enable
</template>

<script>
import _ from 'lodash';
import Vue from 'vue';

export default {
  props: ['orders', 'assetName', 'currencyName'],
  components: {},
  created: function () {
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
    sell: function (orderId) {
      console.log('sell ', orderId);
      this.$emit('sellOrderById', orderId);
    },
    cancel: function (orderId) {
      console.log('cancel ', orderId);
      this.$emit('cancelOrderById', orderId);
    },
    enableOrder: function(orderId) {
      console.log('enable order ', orderId);
      this.$emit('enableOrder', orderId);
    },
    disableOrder: function(orderId) {
      console.log('disable order ', orderId);
      this.$emit('disableOrder', orderId);
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
  },
};
</script>
<style>
table.list-items {
  width: 680px;
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
}

tbody {
    height: 140px;       /* Just for the demo          */
    overflow-y: auto;    /* Trigger vertical scroll    */
    overflow-x: hidden;  /* Hide the horizontal scroll */
}
table td {
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
table th {
  font-size: 16px;
}
table td,
table th {
  padding: 0;
  word-wrap: none;
  line-height: 1;
}

.spot-orders .list-items-scroll {
  height: 140px;
  /*overflow-y: scroll;*/
}
.spot-orders .list-items td {
  padding: 0;
  margin: 0;
}

.spot-orders .list-items tr {
  background: none;
}

.spot-orders .list-items tr:hover {
  background-color: deepskyblue;
}

td.radio {
  width: 45px;
}
td label {
  display: inline;
  font-size: 1em;
}
.col-side {
  width: 49px;
}
.col-amount-asset {
  width: 60px;
}
.col-amount-currency {
  width: 60px;
}
.col-amount-filled {
  width: 60px;
}
.col-price {
  width: 71px;
}
.col-status {
  width: 68px;
}
.col-type {
  width: 85px;
}
.col-date {
  width: 158px;
}
.col-action {
  width: auto;
}
.col-sell-id {
  width: auto;
}
.col-enabled {
  width: auto;
}


.spot-orders .list-items tr.order-closed td {
  background: none;
  color:dimgrey;
}
.spot-orders .list-items tr.order-disabled td {
  background: none;
  color: gray;
}
/*
table {
  border: 1px solid #ccc;
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
}
table caption {
  font-size: 1.5em;
  margin: .5em 0 .75em;
}
table tr {
  border: 1px solid #ddd;
  padding: .35em;
}
table tr:nth-child(even) {
  background: #f8f8f8;  
}
table th,
table td {
  padding: .625em;
  text-align: left;
}
table th {
  background: #999;
  color: #fff;
  font-size: .85em;
  letter-spacing: .1em;
  text-transform: uppercase;
}
table td {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
} 
*/
</style>