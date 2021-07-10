<template lang='pug'>
  div.my2
    .contain(v-if='!data')
      p Unknown SECO instance: SECO doesn't know what gekko this is...
    div(v-if='data')
      div(v-if='isArchived', class='contain brdr--mid-gray p1 bg--orange')
        | This is an archived SECO, it is currently not running anymore.
      div(v-if='data.errorMessage', class='contain brdr--mid-gray p1 bg--orange')
        | This is SECO crashed with the following error: {{ data.errorMessage }}
      .grd.contain
        .grd-row
          .grd-row-col-6-6
            span {{ config.watch.exchange }}: {{ config.watch.asset }} / {{ config.watch.currency }} | 
            span days: {{ chartDateRangeDays }} | 
            span candle size: {{ candleSize }} | 
            span price: {{ price }} | 
            span last: {{ lastCheckPrice }} | 
            span ask: {{ ticker.ask }} | bid: {{ ticker.bid }} 
        .grd-row
          .grd-row-col-3-6.left-panel-col(v-bind:class="{ 'dancer-candles': isDancerCandles, 'dancer-orders': isDancerOrders}")
            chart(:data='chartData', :priceLevels='priceLevels' :spotOrders='spotOrders' v-on:changeTimeRange='changeTimeRange' v-on:changeCandleSize='changeCandleSize' :height='300' :width='480') 
            .grd-row
              .grd-row-col-3-6
                spinner(v-if='loadingOrders')
                template(v-if='!loadingOrders')
                  a.w100--s.btn--primary(href='#', v-on:click.prevent='getOrders') show orders
                spinner(v-if='loadingOrders')
                template(v-if='!loadingOrders')
                  a.w100--s.btn--primary(href='#', v-on:click.prevent='getLimitOrders') limit orders 
              .grd-row-col-3-6
                spinner(v-if='isLoadingCandles')
                template(v-if='!isLoadingCandles')
                  a.w100--s.btn--primary(href='#', v-on:click.prevent='reloadChart') re-load chart
          .grd-row-col-3-6.right-panel-col
            .grd-row.dashboard-row(v-bind:class="{ 'dancer': isDancer}")
              .grd-row-col-3-6.values-col
                .grd-row
                  .grd-row-col-3-6
                    label step size %
                    h3 {{ round01(priceStepPcnt) }}
                  .grd-row-col-3-6
                    label {{ config.watch.currency }}
                    h3 {{ round01(stepAmount) }}  
                .grd-row
                  .grd-row-col-3-6(v-for='balance in balances')
                      label {{ balance.name }}
                      h3 {{ Number(balance.amount).toFixed(2) }}
                .grd-row
                  .grd-row-col-3-6(v-for='balance in initialBalances.balances')
                    label {{ balance.name }}
                    h3 {{ Number(balance.amount).toFixed(2) }}
              .grd-row-col-3-6.inputs-col       
                .grd-row
                  .grd-row-col-3-6
                    label price step %
                  .grd-row-col-3-6
                    label step amount {{ round01(stepAmountPcnt) }}% of currency balance
                .grd-row
                  .grd-row-col-3-6                
                    faderPriceStepPcnt(v-model='priceStepPcnt', v-on:changePriceStepPcnt='changePriceStepPcnt')
                  .grd-row-col-3-6                
                    faderStepAmountPcnt(v-model='stepAmountPcnt', v-on:changeStepAmountPcnt='changeStepAmountPcnt')  
                .grd-row.py1
                  .grd-row-col-6-6
                    a.w100--s.btn--primary(href='#', v-on:click.prevent='setInitialBalances') set initial balances
                    a.w100--s.btn--primary(href='#', v-on:click.prevent='loadInitialBalances') load initial balances
                    a.w100--s.btn--primary(href='#', v-on:click.prevent='saveSettings') save settings
                    a.w100--s.btn--primary(href='#', v-on:click.prevent='loadSettings') load settings
                    a.w100--s.btn--primary(href='#', v-on:click.prevent='testButtonTwo') B 2
                    a.w100--s.btn--primary(href='#', v-on:click.prevent='getBalances') get balances
                    a.w100--s.btn--primary(href='#', v-on:click.prevent='getTicker') get ticker
            .grd-row
              .grd-row-col-3-6
                div.input-checkbox
                  input(type='checkbox' id='is_real_order_enabled' v-model='isRealOrdersEnabled')
                  strong enable orders
                div.input-checkbox
                  input(type='checkbox' id='is_trading_enabled' v-model='isTradingEnabled')
                  strong enable trading   
              .grd-row-col-3-6
                .grd-row
                  .grd-row-col-3-6
                    div
                      label(for='currencyTotal') {{ config.watch.currency }} total:
                      input(v-model='currencyTotal')
                  .grd-row-col-3-6.px1
                    div
                      label(for='assetAmount') {{ config.watch.asset }} amount:
                      input(v-model='assetAmount')
            .grd-row.py1
              .grd-row-col-3-6
              .grd-row-col-3-6
                a.w100--s.btn--primary(href='#', v-on:click.prevent='buy') buy {{ config.watch.asset }}
                a.w100--s.btn--primary(href='#', v-on:click.prevent='sell') sell {{ config.watch.asset }}   
        .grd-row.orders-row
          .grd-row-col-6-6
            spotOrdersList(:orders='orders' v-on:sellOrderById='sellOrderById' v-on:enableOrder='enableOrder' v-on:disableOrder='disableOrder')
</template>

<script>
//v-on:changeTimeRange='changeTimeRange' v-on:changeCandleSize='changeCandleSize'
import Vue from 'vue'
import _ from 'lodash'
import { post } from '../../tools/ajax'
import spinner from '../global/blockSpinner.vue'
import chart from '../global/tradingViewChart.vue'
import rangeCreator from '../global/configbuilder/rangecreator.vue'
import faderPriceStepPcnt from '../global/gridFader/priceStepPcnt';
import faderStepAmountPcnt from '../global/gridFader/stepAmountPcnt';
import spotOrdersList from './orders';

export default {
  created: function() {
    if(!this.isLoading) {
      this.getCandles();
    }
    this.loadSettings();
    this.loadInitialBalances();
  },
  components: {
    spinner,
    chart,
    spotOrdersList,
    rangeCreator,
    faderPriceStepPcnt,
    faderStepAmountPcnt
  },
  data: function() {
    return {
      price: 0,
      lastCheckPrice: 0,
      currentAssetPrice: 0,
      candleFetch: 'idle',
      candles: false,
      range: {},
      chartDateRangeDays: 14,
      candleSize: 1,
      ticker: {},
      balances: [],
      initialBalances: [],
      orders: [],
      spotOrders: [],
      lastOrderIds: false,

      priceStepPcnt: 0,
      stepAmountPcnt: 0,
      stepAmount: 0,
      
      currencyTotal: 0,
      assetAmount: 0,
      
      filterNewBuy: false,
      filterNewSell: false,
      filterFilledBuy: false,
      filterFilledSell: true,

      gridLoaded: false,
      gridLoading: false,
      loadingOrders: false,
      isDancer: false,
      isDancerOrders: false,
      isDancerCandles: false,
      isRealOrdersEnabled: false,
      isTradingEnabled: false
    }
  },
  computed: {
    balanceCurrencyAmount: function() {
      let currency = _.find(this.balances, (balance) => {
        if (balance.name === this.config.watch.currency) {
          return true;
        }
      });
      if (currency) {
        return currency.amount;
      } 
      return 0;
    },
    id: function() {
      return this.$route.params.id;
    },
    gekkos: function() {
      return this.$store.state.gekkos;
    },
    archivedGekkos: function() {
      return this.$store.state.archivedGekkos;
    },
    data: function() {
      // console.log('computed data: ');
      // console.log('this.id = ', this.id );
      // console.log('this.gekkos[this.id] = ', this.gekkos[this.id]);
      if(!this.gekkos)
        return false;
      if(_.has(this.gekkos, this.id))
        return this.gekkos[this.id];
      if(_.has(this.archivedGekkos, this.id))
        return this.archivedGekkos[this.id];

      return false;
    },
    config: function() {
      return _.get(this, 'data.config');
    },
    latestEvents: function() {
      return _.get(this, 'data.events.latest');
    },
    initialEvents: function() {
      return _.get(this, 'data.events.initial');
    },
    isLive: function() {
      return _.has(this.gekkos, this.id);
    },
    type: function() {
      return this.data.logType;
    },
    isStratrunner: function() {
      return this.type !== 'watcher';
    },
    isArchived: function() {
      return this.data.stopped;
    },
    chartData: function() {
      return {
        candles: this.candles,
        trades: this.trades,
        priceGrid: this.priceGrid
      }
    },
    isLoading: function() {
      if(!this.data)
        return true;
      if(!_.get(this.data, 'events.initial.candle'))
        return true;
      if(!_.get(this.data, 'events.latest.candle'))
        return true;

      return false;
    },
    isLoadingGrid: function() {
      return this.gridLoading || this.isLoading;
    },
    isLoadingCandles: function() {
      if (this.candleFetch === 'fetched') {
        return false;
      } else {
        return true;
      }
    },
    watcher: function() {
      if(!this.isStratrunner) {
        return false;
      }
      let watch = Vue.util.extend({}, this.data.config.watch);
      return _.find(this.gekkos, g => {
        if(g.id === this.id) {
          return false;
        }
        return _.isEqual(watch, g.config.watch);
      });
    }
  },
  watch: {
    candleSize: function(size) {
      //console.log('watch:  candleSize: ', size);
      this.getCandles();
    },
    chartDateRangeDays: function(days) {
      //console.log('watch: chartDateRangeDays: days: ', days);
      this.updateRange();
      this.getCandles();
    },
    'data.events.latest.candle.start': function() {
      this.updateRange();
      setTimeout(this.getCandles, 200);
    },
    'data.events.latest.candle.close': function(price) {
      this.updateCurrentPrice(price);
    },
    'data.events.latest.balances': function(balances) {
      //console.log('balances ', balances);
    },
    'data.ticker': function(ticker) {
      //console.log('data.ticker: ', ticker);
      this.ticker = ticker;
      if (!this.price) {
        this.updateCurrentPrice(this.ticker.bid);
      }
      this.isDancer = false;
    },
    'data.orders': function(orders) {
      //console.log('data.localOrders ', orders);
      this.orders = orders;
      this.spotOrders = orders;
      this.isDancerOrders = false;
    },
    'data.balances': function(balances) {
      //console.log('data.balances ', balances);
      this.balances = balances;
      this.isDancer = false;
    },
    'data.initialBalances': function(balances) {
      //console.log('data.balances ', balances);
      this.initialBalances = balances;
      this.isDancer = false;
    },
    'data.saveSettingsActionResult': function(result) {
      if (result && result.path) {
        console.log('Settings saved to: ', result.path);
      } else {
        console.log('Save setting error.');
      }
      this.isDancer = false;
    },
    'data.settings': function(settings) {
      this.priceStepPcnt = settings.priceStepPcnt;
      this.stepAmountPcnt = settings.stepAmountPcnt;
      this.candleSize = settings.candleSize;
      this.chartDateRangeDays = settings.chartDateRangeDays;
      this.isDancer = false;
    },
    currencyTotal: function(total) {
      if (this.price && this.price > 0) {
        this.assetAmount = Number(total / this.price).toFixed(0);
      }
    },
    assetAmount: function(amount) {
      this.currencyTotal = Number(amount * this.price).toFixed(0);
    },
    isTradingEnabled: function(isEnabled) {
      this.trading(isEnabled);
    },
    isRealOrdersEnabled: function(isEnabled) {
      this.realOrders(isEnabled);
    },
    'data.lastOrderIds': function(lastOrderIds) {
      this.lastOrderIds = lastOrderIds;
    },
    stepAmountPcnt: function(value) {
      this.stepAmount = (this.balanceCurrencyAmount / 100) * value;
    },
    balanceCurrencyAmount: function(value) {
      this.stepAmount = (value / 100) * this.stepAmountPcnt;
    },
    'data.lastTimeCheckPrice': function(value) {
      this.lastCheckPrice = value;
      this.updateChartPriceLines();
    },
    'data.tradingEnabled': function(isEnabled) {
      this.isTradingEnabled = isEnabled;
    },
    'data.realOrdersEnabled': function(isEnabled) {
      this.isRealOrdersEnabled = isEnabled;
    }
  },
  methods: {
    saveSettings: function() {
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'saveSettingsAction',
          args: [
            {
              priceStepPcnt: this.priceStepPcnt,
              stepAmountPcnt: this.stepAmountPcnt,
              candleSize: this.candleSize,
              chartDateRangeDays: this.chartDateRangeDays
            }
          ]
        }
      };
      this.isDancer = true;
      post('pipelineAction', req, (err, res) => {
        if (res && res.pipelineActionReturn) {
          console.log('ok: ', res);
        } else {
          console.log('err: ', err);
        }
      });
    },
    loadSettings: function() {
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'loadSettingsAction',
          args: []
        }
      };
      this.isDancer = true;
      post('pipelineAction', req, (err, res) => {
        if (res && res.pipelineActionReturn) {
          console.log('ok: ', res);
        } else {
          console.log('err: ', err);
        }
      });
    },
    reloadChart: function() {
      this.getCandles();
    },
    updateCurrentPrice: function(price) {
      //console.log('price ', price);
      this.price = price;
      this.currentAssetPrice = price;
      this.initialPrice = price;
    },
    // updateChartDateRangeDays: function(days) {
    //   //console.log('updateChartDateRangeDays', days);
    //   this.chartDateRangeDays = days;
    // },
    
    updateRange: function() {
      let days = this.chartDateRangeDays;
      let now = moment().startOf('minute');
      let then = now.clone().subtract(days, 'd');
      this.range.to = this.fmt(now);
      this.range.from = this.fmt(then);
      //console.log('range is ', this.range);
      //this.$emit('config', this.config);
    },
    round: n => (+n).toFixed(5),
    roundInt: n => (n).toFixed(0),
    round01: n => (n).toFixed(1),
    humanizeDuration: (n, x) => window.humanizeDuration(n, x),
    moment: mom => moment.utc(mom),
    fmt: mom => moment.utc(mom).format('YYYY-MM-DD HH:mm'),
    getCandles: function() {
      //console.log('getting candles...');
      if(this.isLoading) {
        //console.log('isLoading');
        return;
      }
      if(this.candleFetch === 'fetching') {
        //console.log('fetching');
        return;
      }
      this.candleFetch = 'fetching';
      let candleSize = this.candleSize;
      // console.log('this.data.config.candleSize ', this.data.config.candleSize);
      // console.log('this.config.candleSize ', this.config.candleSize);
      // console.log('this.config.candleSize ', this.config.candleSize);
      let config = {
        watch: this.data.config.watch,
        daterange: this.range,
        candleSize: candleSize
      }
      // We timeout because of 2 reasons:
      // - In case we get a batch of candles we only fetch once
      // - This way we give the db (mostly sqlite) some time to write
      //   the result before we query it.
      this.isDancerCandles = true;
      setTimeout(() => {
        post('getCandles', config, (err, res) => {
          if(!res || res.error || !_.isArray(res)) {
            //console.log(res);
          } else {
            //console.log('got candles!');
            this.liveCandles = res.map(c => {
              c.date = c.start;
              c.time = c.date;
              return c;
            });
            this.candles = this.liveCandles;
            if (!this.gridLoaded) {
              //this.loadGrid();
            }
          }
          this.candleFetch = 'fetched';
          this.isDancerCandles = false;
        })
      }, 400);
    },
    stopGekko: function() {
      if(!confirm('Are you sure you want to stop this Gekko?')) {
        return;
      }
      post('stopGekko', { id: this.data.id }, (err, res) => {
        //console.log('stopped gekko');
      });
    },
    deleteGekko: function() {
      if(!this.isArchived) {
        return alert('This Gekko is still running, stop it first!');
      }

      if(!confirm('Are you sure you want to delete this Gekko?')) {
        return;
      }

      post('deleteGekko', { id: this.data.id }, (err, res) => {
        this.$router.push({
          path: `/live-gekkos/`
        });
      });
    },
    getOrderFilterCondition: function(order) {
      let condNewBuy = (order.status === 'NEW' && order.side === 'BUY' && this.filterNewBuy);
      let condNewSell = (order.status === 'NEW' && order.side === 'SELL' && this.filterNewSell);
      let condFilledBuy = (order.status === 'FILLED' && order.side === 'BUY' && this.filterFilledBuy);
      let condFilledSell = (order.status === 'FILLED' && order.side === 'SELL' && this.filterFilledSell);
      let cond = (condNewBuy || condNewSell || condFilledBuy || condFilledSell);
      return cond;
    },
    getBalances: function() {
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'getBalancesAction',
          args: []
        }
      };
      this.isDancer = true;
      post('pipelineAction', req, (err, res) => {
        if (res && res.pipelineActionReturn) {
          console.log('ok: ', res);
        } else {
          console.log('err: ', err);
        }
      });
    },
    setInitialBalances: function() {
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'saveInitialBalancesAction',
          args: []
        }
      };
      this.isDancer = true;
      post('pipelineAction', req, (err, res) => {
        if (res && res.pipelineActionReturn) {
          console.log('ok: ', res.pipelineActionReturn);
        } else {
          console.log('err: ', err);
        } 
      });
    },
    loadInitialBalances: function() {
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'loadInitialBalancesAction',
          args: []
        }
      };
      this.isDancer = true;
      post('pipelineAction', req, (err, res) => {
        if (res && res.pipelineActionReturn) {
          console.log('ok: ', res.pipelineActionReturn);
        } else {
          console.log('err: ', err);
        } 
      });
    },
    showOrdersOnChart: function() {
      this.spotOrders = Object.freeze(this.orders);
    },
    getOrders: function() {
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'getOrdersAction',
          args: []
        }
      };
      this.isDancerOrders = true;
      post('pipelineAction', req, (err, res) => {
        if (res && res.pipelineActionReturn) {
          console.log('ok: ', res);
        } else {
          console.log('err: ', err);
        }
      });
    },
    getTicker: function() {
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'getTickerAction',
          args: []
        }
      };
      this.isDancer = true;
      post('pipelineAction', req, (err, res) => {
        if (res && res.pipelineActionReturn) {
          console.log('ok: ', res);
        } else {
          console.log('err: ', err);
        }
      });
    },
    changeTimeRange: function(value) {
      this.chartDateRangeDays = value;
      this.saveSettings();
    },
    changeCandleSize: function(size) {
      this.data.config.candleSize = size;
      this.config.candleSize = size;
      this.candleSize = size;
      this.saveSettings();
    },
    changePriceStepPcnt: function(value) {
      this.priceStepPcnt = value;
      this.updateChartPriceLines();
    },
    changeStepAmountPcnt: function(value) {
      this.stepAmountPcnt = value;
      this.stepAmount = (this.balanceCurrencyAmount / 100) * this.stepAmountPcnt;
    },
    updateChartPriceLines: function() {
      let levels = this.calcPriceLevels(this.price, this.priceStepPcnt);
      levels.push({price: this.lastCheckPrice, color: 'gray'}); 
      this.priceLevels = Object.freeze(levels);
      // console.log('this.priceLevels');
      // console.log(this.priceLevels);
      //this.$emit('setPriceLevels', this.priceLevels);
    },
    calcPriceLevels: function(price, priceStepPcnt) {
      let levels = [];
      let stepPrice = (price / 100) * priceStepPcnt;
      let lowerPrice = price - stepPrice;
      let upperPrice = price + stepPrice;
      levels.push({price: lowerPrice, color: 'black'});
      levels.push({price: upperPrice, color: 'black'});
      return levels;
    },
    buy: function() {
      if (this.assetAmount && this.assetAmount > 0) {
        let req = {
          pipelineId: this.data.id,
          pipelineAction: {
            name: 'buyAction',
            args: [this.assetAmount]
          }
        };
        this.isDancerOrders = true;
        post('pipelineAction', req, (err, res) => {
          if (res && res.pipelineActionReturn) {
            console.log('ok: ', res);
          } else {
            console.log('err: ', err);
          }
        });
      }
    },
    sell: function() {
      if (this.assetAmount && this.assetAmount > 0) {
        let req = {
          pipelineId: this.data.id,
          pipelineAction: {
            name: 'sellAction',
            args: [this.assetAmount]
          }
        };
        this.isDancerOrders = true;
        post('pipelineAction', req, (err, res) => {
          if (res && res.pipelineActionReturn) {
            console.log('ok: ', res);
          } else {
            console.log('err: ', err);
          }
        });
      }
    },
    sellOrderById: function(orderId) {
      console.log('selling ordder ', orderId);
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'sellOrderByIdAction',
          args: [orderId]
        }
      };
      this.isDancerOrders = true;
      post('pipelineAction', req, (err, res) => {
        if (res && res.pipelineActionReturn) {
          console.log('ok: ', res);
        } else {
          console.log('err: ', err);
        }
      });
    },
    enableOrder: function(orderId) {
      //console.log('selling ordder ', orderId);
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'enableOrderAction',
          args: [orderId]
        }
      };
      this.isDancerOrders = true;
      post('pipelineAction', req, (err, res) => {
        if (res && res.pipelineActionReturn) {
          console.log('ok: ', res);
        } else {
          console.log('err: ', err);
        }
      });
    },
    disableOrder: function(orderId) {
      //console.log('selling ordder ', orderId);
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'disableOrderAction',
          args: [orderId]
        }
      };
      this.isDancerOrders = true;
      post('pipelineAction', req, (err, res) => {
        if (res && res.pipelineActionReturn) {
          console.log('ok: ', res);
        } else {
          console.log('err: ', err);
        }
      });
    },
    realOrders: function(isEnabled) {
      //console.log('selling ordder ', orderId);
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'realOrdersAction',
          args: [isEnabled]
        }
      };
      this.isDancer = true;
      post('pipelineAction', req, (err, res) => {
        if (res && res.pipelineActionReturn) {
          console.log('ok: ', res);
        } else {
          console.log('err: ', err);
        }
      });
    },
    trading: function(isEnabled) {
      //console.log('selling ordder ', orderId);
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'tradingAction',
          args: [isEnabled]
        }
      };
      this.isDancer = true;
      post('pipelineAction', req, (err, res) => {
        if (res && res.pipelineActionReturn) {
          console.log('ok: ', res);
        } else {
          console.log('err: ', err);
        }
      });
    },
    
    
    testButtonOne: function() {
      //this.saveSpot();
      //this.numberOfLevels++;
      // let req = {
      //   pipelineId: this.data.id,
      //   pipelineAction: {
      //     name: 'testWithArgsAction',
      //     args: ['bdshjvfh bvfhsbf ...']
      //   }
      // }
      // post('pipelineAction', req, (err, res) => {
      //   console.log('testWithArgsAction: ', res);
      // });
    },
    testButtonTwo: function() {
      console.log('this.data.config.candleSize ', this.data.config.candleSize);
      console.log('this.config.candleSize ', this.config.candleSize);
      console.log('this.config.candleSize ', this.config.candleSize);
      // console.log('this.$store.state:');
      // console.log(this.$store.state);
      //console.log('this.data ', this.data);
      // console.log('getGridLevels');
      // post('getGridLevels', { id: this.data.id }, (err, res) => {
      //   console.log('getGridLevels result');
      //   console.log(res);
      // });
    }
  }
}
</script>

<style>
</style>
