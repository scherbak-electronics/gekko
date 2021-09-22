<template lang='pug'>
.spot-orders
  .list-items-scroll
    table.list-items
      thead
        tr
          th.col-date(v-on:click.prevent='toggleDirSortByDate') date
          th.col-side side
          th.col-amount-asset asset
          th.col-amount-currency currency
          th.col-price price
          th.col-status profit
          th.col-sell-id sell id
          th.col-id id
          th.col-enabled enabled
          th.col-action action
          th.col-action action
      tbody
        tr(v-bind:class="{'order-disabled': !order.isEnabled, 'order-closed': order.profitCurrency && order.side == 'SELL', 'order-opened': (!order.sellId && order.side == 'BUY')}" v-for='order in sortedOrdersByDate')
          td.col-date {{ formatDate(order.time) }}
          td.col-side {{ order.side }}
          td.col-amount-asset {{ Number(order.amountAsset).toFixed(3) }}
          td.col-amount-currency {{ Number(order.amountCurrency).toFixed(2) }}
          td.col-price {{ Number(order.price).toFixed(4) }}
          td.col-status(v-if='order.profitCurrency') {{Number(order.profitCurrency).toFixed(3)}}
          td.col-status(v-if='!order.profitCurrency') -
          td.col-sell-id(v-if='order.sellId') {{ order.sellId }}
          td.col-sell-id(v-if='!order.sellId') - 
          td.col-id {{ order.id }}
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
      sortedOrdersByDate: [],
      orderDateSortDir: true
      // setIndex: -1,
      // customTo: false,
      // customFrom: false,
      // rangeVisible: false,
      // set: false
    };
  },
  computed: {
    
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
    },
    toggleDirSortByDate: function() {
      this.orderDateSortDir = !this.orderDateSortDir;
      this.sortByDate();
    },
    sortByDate: function() {
      this.sortedOrdersByDate.sort((a, b) => {
        if (this.orderDateSortDir) {
          return moment(b.time).unix() - moment(a.time).unix();
        } else {
          return moment(a.time).unix() - moment(b.time).unix();
        }
      });
    },
    formatDate: function(time) {
      console.log(time);
      return moment.unix(time).format('MM-DD HH:mm');
    },
    reloadOrders: function() {
      if (this.orders && this.orders.length) {
        this.sortedOrdersByDate = [];
        this.sortedOrdersByDate = this.orders.map((item) => {
          return item;
        });
      }
    }
  },
  watch: {
    orders: function() {
      this.reloadOrders();
      this.sortByDate();
    }
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
table.list-items thead { display: block; table-layout: fixed;}
table.list-items tbody {
    display: block;
    height: 140px;       /* Just for the demo          */
    overflow-y: scroll;    /* Trigger vertical scroll    */
    overflow-x: hidden;  /* Hide the horizontal scroll */
    table-layout: fixed;
}
table.list-items td {
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
table.list-items th {
  font-size: 16px;
}
table.list-items td,
table.list-items th {
  padding: 0;
  word-wrap: none;
  line-height: 1.2;
  min-width: 80px;
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

.spot-orders .list-items tbody tr:hover {
  background-color: #000000;
}

.spot-orders .list-items tbody tr:hover td {
  color:#ffffff;
}

.list-items td.radio {
  width: 45px;
}
.list-items td label {
  display: inline;
  font-size: 1em;
}
.col-side {
  width: 30px;
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
  width: 80px;
}
th.col-date {
  cursor: pointer;
}
.col-action {
  width: auto;
}
.col-sell-id {
  width: auto;
}
.col-id {
  width: auto;
}
.col-enabled {
  width: auto;
}


.spot-orders .list-items tr.order-closed td {
  background: none;
  color: #a1880b;
}
.spot-orders .list-items tr.order-opened td {
  background: none;
  color: #217a0b;
}

.spot-orders .list-items tr.order-disabled td {
  background: none;
  color: #bfbfbf;
}
tr.order-closed:hover td,
tr.order-opened:hover td,
tr.order-disabled:hover td {
  color:#ffffff;
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