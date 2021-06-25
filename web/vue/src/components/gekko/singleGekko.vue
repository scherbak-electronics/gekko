<template lang='pug'>
  div.my2
    .contain(v-if='!data')
      p Unknown SECO instance: SECO doesn't know what gekko this is...
    div(v-if='data')
      div(v-if='isArchived', class='contain brdr--mid-gray p1 bg--orange')
        | This is an archived SECO, it is currently not running anymore.
      div(v-if='data.errorMessage', class='contain brdr--mid-gray p1 bg--orange')
        | This is SECO crashed with the following error: {{ data.errorMessage }}
      p(v-if='isStratrunner && !watcher && !isArchived') 
        small WARNING: stale gekko, not attached to a watcher
      .grd.contain
        .grd-row
          .grd-row-col-6-6
            span {{ config.watch.exchange }}: {{ config.watch.asset }} / {{ config.watch.currency }} | 
            span days: {{ chartDateRangeDays }} | 
            span candle size: {{ config.candleSize }} | 
            span price: {{ currentAssetPrice }}
        .grd-row
          .grd-row-col-4-6
            chart(:data='chartData', :priceLevels='priceLevels' :spotOrders='spotOrders' :height='350' :width='660') 
            .grd-row 
              .grd-row-col-1-6
                spinner(v-if='isLoadingCandles')
                template(v-if='!isLoadingCandles')
                  a.w100--s.btn--primary(href='#', v-on:click.prevent='reloadChart') re-load chart
                spinner(v-if='loadingOrders')
                template(v-if='!loadingOrders')
                  a.w100--s.btn--primary(href='#', v-on:click.prevent='loadOrders') load orders
                spinner(v-if='loadingOrders')
                template(v-if='!loadingOrders')
                  a.w100--s.btn--primary(href='#', v-on:click.prevent='loadOrdersAdvanced') restore orders 
              .grd-row-col-1-6
                div.input-checkbox
                  input(type='checkbox' id='filter_new_buy' v-model='filterNewBuy')
                  strong new buy
                div.input-checkbox
                  input(type='checkbox' id='filter_new_sell' v-model='filterNewSell')
                  strong new sell
                div.input-checkbox
                  input(type='checkbox' id='filter_filled_buy' v-model='filterFilledBuy')
                  strong filled buy
                div.input-checkbox
                  input(type='checkbox' id='filter_filled_sell' v-model='filterFilledSell')
                  strong filled sell
              .grd-row-col-2-6
                div.px1
                  label(for='config.candleSize') time range (days)
                  input(v-model='chartDateRangeDays')
                div.px1
                  label(for='config.candleSize') candle size
                  input(v-model='config.candleSize')
              .grd-row-col-2-6
                spinner(v-if='isLoading')
                template(v-if='!isLoading')
                  label since:
                  strong
                    small(v-if='initialEvents.candle') {{ fmt(initialEvents.candle.start) }}
                  br
                  label data spanning
                  strong 
                    small(v-if='latestEvents.candle') {{ humanizeDuration(moment(latestEvents.candle.start).diff(moment(initialEvents.candle.start))) }} 
            .grd-row 
              .grd-row-col-6-6
                spotOrdersList(:orders='spotOrders' v-on:sellOrderById='spotOrderSell' v-on:cancelOrderById='spotOrderCancel')
          .grd-row-col-2-6
            .grd-row
              .grd-row-col-2-6(v-for='balance in balances')
                label {{ balance.name }}
                h3 {{ Number(balance.amount).toFixed(2) }} 
            .grd-row
              .grd-row-col-2-6
                label levels
                h3 {{ numberOfLevels }}
              .grd-row-col-2-6
                label step %
                h3 {{ round01(priceStepPcnt) }}
              .grd-row-col-2-6
                label HI %
                h3 {{ round01(priceHiLimitPcnt) }}
              .grd-row-col-2-6
                label LOW %
                h3 {{ round01(priceLowLimitPcnt) }}
            .grd-row
              .grd-row-col-2-6
                faderNumberOfLevels(v-model='numberOfLevels' v-on:changeNumberOfLevels='changeNumberOfLevels')
              .grd-row-col-2-6                
                faderPriceStepPcnt(v-model='priceStepPcnt', v-on:changePriceStepPcnt='changePriceStepPcnt')
              .grd-row-col-2-6                
                faderPriceHiLimitPcnt(v-model='priceHiLimitPcnt', v-on:changePriceHiLimitPcnt='changePriceHiLimitPcnt')
              .grd-row-col-2-6
                faderPriceLowLimitPcnt(v-model='priceLowLimitPcnt', v-on:changePriceLowLimitPcnt='changePriceLowLimitPcnt')
            .grd-row
              .grd-row-col-4-6.py1
                faderTradingAmountPcnt(v-model='tradingAmountPcnt' v-on:changeTradingAmountPcnt='changeTradingAmountPcnt')
              .grd-row-col-2-6
                label amount %
                h3 {{ round01(tradingAmountPcnt) }}
            .grd-row
              .grd-row-col-6-6
                label since:
                strong
                  small(v-if='initialEvents.candle') {{ fmt(initialEvents.candle.start) }}
                br
                label data spanning
                strong 
                  small(v-if='latestEvents.candle') {{ humanizeDuration(moment(latestEvents.candle.start).diff(moment(initialEvents.candle.start))) }} 
            .grd-row
              .grd-row-col-6-6
                a.w100--s.btn--primary(href='#', v-on:click.prevent='saveSpot') save spot
                a.w100--s.btn--primary(href='#', v-on:click.prevent='saveGrid') save grid
                a.w100--s.btn--primary(href='#', v-on:click.prevent='loadSpot') load spot
                a.w100--s.btn--primary(href='#', v-on:click.prevent='testButtonOne') B 1
                a.w100--s.btn--primary(href='#', v-on:click.prevent='testButtonTwo') B 2
                a.w100--s.btn--primary(href='#', v-on:click.prevent='getBalances') get balances
                a.w100--s.btn--primary(href='#', v-on:click.prevent='getTicker') get ticker
                spinner(v-if='isLoadingGrid')
                template(v-if='!isLoadingGrid')
                  a.w100--s.btn--primary(href='#', v-on:click.prevent='loadGrid') load grid
            .grd-row
              .grd-row-col-2-6
                label to buy
                h3 {{ Number(buyAssetAmount).toFixed(1) }}
                label of {{ config.watch.asset }}
              .grd-row-col-2-6
                label you need
                h3 {{ Number(buyAssetCurrencyAmount).toFixed(1) }}
                label of {{ config.watch.currency }}
            .grd-row.py1
              .grd-row-col-6-6
                div
                  label(for='buyAssetCurrencyPcnt') total {{ config.watch.currency }} (to buy {{ Number(buyAssetAmount).toFixed(1) }} {{ config.watch.asset }})
                  input(v-model='buyAssetCurrencyAmount')
                faderBuyAssetCurrencyPcnt(v-model='buyAssetCurrencyPcnt' v-on:changeBuyAssetCurrencyPcnt='changeBuyAssetCurrencyPcnt')    
            .grd-row
              .grd-row-col-3-6
                a.w100--s.btn--primary(href='#', v-on:click.prevent='spotBuy') buy {{ config.watch.asset }}
              .grd-row-col-3-6
                a.w100--s.btn--primary(href='#', v-on:click.prevent='spotSell') sell {{ config.watch.currency }}
            div(v-if='!isArchived')
              a.w100--s.btn--red(href='#', v-on:click.prevent='stopGekko') stop
            div(v-if='isArchived')
              a.w100--s.btn--red(href='#', v-on:click.prevent='deleteGekko') delete
            div(v-if='watcher')  
              router-link(:to='"/live-gekkos/" + watcher.id') watcher        
</template>

<script>
import Vue from 'vue'
import _ from 'lodash'
import { post } from '../../tools/ajax'
import spinner from '../global/blockSpinner.vue'
import chart from '../global/tradingViewChart.vue'
//import roundtrips from '../backtester/result/roundtripTable.vue'
//import paperTradeSummary from '../global/paperTradeSummary.vue'
import rangeCreator from '../global/configbuilder/rangecreator.vue'
import faderPriceStepPcnt from '../global/gridFader/priceStepPcnt';
import faderPriceHiLimitPcnt from '../global/gridFader/priceHiLimitPcnt';
import faderPriceLowLimitPcnt from '../global/gridFader/priceLowLimitPcnt';
import faderNumberOfLevels from '../global/gridFader/numberOfLevels';
import faderTradingAmountPcnt from '../global/gridFader/tradingAmountPcnt';
import faderBuyAssetCurrencyPcnt from '../global/gridFader/buyAssetCurrencyPcnt';
import faderSellAssetAmount from '../global/gridFader/sellAssetAmount';
import spotOrdersList from './orders';


// global moment
var prepearedCandels = [];

export default {
  created: function() {
    this.loadSpot();
    if (this.chartDateRangeDays === 0) {
      this.chartDateRangeDays = 14;
    }
    if(!this.isLoading) {
      this.getCandles();
    }
    //this.interval = setInterval(this.updateRange, 10000);
  },
  components: {
    spinner,
    chart,
    spotOrdersList,
    rangeCreator,
    faderPriceStepPcnt,
    faderPriceHiLimitPcnt,
    faderPriceLowLimitPcnt,
    faderNumberOfLevels,
    faderTradingAmountPcnt,
    faderBuyAssetCurrencyPcnt,
    faderSellAssetAmount
  },
  data: function() {
    return {
      candleFetch: 'idle',
      candles: false,
      range: {},
      chartDateRangeDays: 0,

      numberOfLevels: 1,
      priceStepPcnt: 1,
      priceHiLimitPcnt: 1,
      priceLowLimitPcnt: 1,
      initialPrice: 1,
      priceLevels: [],
      balances: [],
      tradingAmountPcnt: 1,
      exchangePortfolioCurrencyAmount: 100,
      tradingDepositAmount: 1,
      currentAssetPrice: 0,
      tradingDepositAmountNeed: 0,
      tradingStartTime: moment().unix(),
      buyAssetCurrencyAmount: 0,
      buyAssetCurrencyPcnt: 0,
      buyAssetAmount: 0,
      sellAssetAmount: 0,

      spotOrders: [],
      filterNewBuy: false,
      filterNewSell: false,
      filterFilledBuy: false,
      filterFilledSell: true,

      gridLoaded: false,
      gridLoading: false,
      loadingOrders: false
    }
  },
  computed: {
    balanceCurrencyAmount: function() {
      let amount = 0;
      _.each(this.balances, (balance) => {
        if (balance.name === this.config.watch.currency) {
          amount = balance.amount;
        }
      });
      return amount;
    },
    spot: function() {
      return {
        candleSize: this.config.candleSize,
        chartDateRangeDays: this.chartDateRangeDays,
        asset: this.watcher.config.watch.asset,
        currency: this.watcher.config.watch.currency,
        exchange: this.watcher.config.watch.exchange
      };
    },
    grid: function() {
      return {
        numberOfLevels: this.numberOfLevels,
        priceStepPcnt: this.priceStepPcnt,
        priceHiLimitPcnt: this.priceHiLimitPcnt,
        priceLowLimitPcnt: this.priceLowLimitPcnt,
        initialPrice: this.initialPrice,
        priceLevels: this.priceLevels,
        tradingAmountPcnt: this.tradingAmountPcnt,
        exchangePortfolioCurrencyAmount: this.exchangePortfolioCurrencyAmount,
        tradingDepositAmount: this.tradingDepositAmount,
        currentAssetPrice: this.currentAssetPrice,
        tradingDepositAmountNeed: this.tradingDepositAmountNeed
      };
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
      console.log('computed data: ');
      console.log('this.id = ', this.id );
      console.log('this.gekkos[this.id] = ', this.gekkos[this.id]);
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
    // trades: function() {
    //   return _.get(this, 'data.events.tradeCompleted') || [];
    // },
    // roundtrips: function() {
    //   return _.get(this, 'data.events.roundtrip') || [];
    // },
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
    },
    hasLeechers: function() {
      if(this.isStratrunner) {
        return false;
      }

      let watch = Vue.util.extend({}, this.data.config.watch);

      return _.find(this.gekkos, g => {
        if(g.id === this.id)
          return false;

        return _.isEqual(watch, g.config.watch);
      });
    }
  },
  watch: {
    'config.candleSize': function(size) {
      //console.log('size ', size);
      this.getCandles();
    },
    chartDateRangeDays: function(days) {
      //console.log('days ', days);
      this.updateRange();
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
    'data.events.latest.sendTicker.ticker': function(event) {
      //console.log('sendTicker ', event);
    },
    'data.localOrders': function(orders) {
      //console.log('data.localOrders ', orders);
      this.spotOrders = orders;
    },
    'data.buyAssetCurrencyPcnt': function(value) {
     // console.log('watch buyAssetCurrencyPcnt ', value);
    }
  },
  methods: {
    changeBuyAssetCurrencyPcnt: function(value) {
      this.buyAssetCurrencyPcnt = value;
      this.buyAssetCurrencyAmount = (this.balanceCurrencyAmount / 100) * this.buyAssetCurrencyPcnt; 
      this.buyAssetCurrencyAmount = Number(this.buyAssetCurrencyAmount).toFixed(2);
      if (this.currentAssetPrice > 0) {
        this.buyAssetAmount = this.buyAssetCurrencyAmount / this.currentAssetPrice;
      }
    },
    reloadChart: function() {
      this.getCandles();
    },
    updateCurrentPrice: function(price) {
      //console.log('price ', price);
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
      console.log('getting candles...');
      if(this.isLoading) {
        console.log('isLoading');
        return;
      }
      if(this.candleFetch === 'fetching') {
        console.log('fetching');
        return;
      }
      this.candleFetch = 'fetching';
      let candleSize = this.data.config.candleSize;
      //console.log('size ', candleSize);
      let config = {
        watch: this.data.config.watch,
        daterange: this.range,
        candleSize: candleSize
      }
      // We timeout because of 2 reasons:
      // - In case we get a batch of candles we only fetch once
      // - This way we give the db (mostly sqlite) some time to write
      //   the result before we query it.
      setTimeout(() => {
        post('getCandles', config, (err, res) => {
          if(!res || res.error || !_.isArray(res)) {
            console.log(res);
          } else {
            console.log('got candles!');
            this.liveCandles = res.map(c => {
              c.date = c.start;
              c.time = c.date;
              return c;
            });
            this.candles = this.liveCandles;
            if (!this.gridLoaded) {
              this.loadGrid();
            }
          }
          this.candleFetch = 'fetched';
        })
      }, 400);
    },
    stopGekko: function() {
      if(this.hasLeechers) {
        return alert('This Gekko is fetching market data for multiple stratrunners, stop these first.');
      }

      if(!confirm('Are you sure you want to stop this Gekko?')) {
        return;
      }

      post('stopGekko', { id: this.data.id }, (err, res) => {
        console.log('stopped gekko');
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
    
    saveGrid: function() {
      let req = {id: this.data.id, grid: this.grid}; 
      post('saveGrid', req, (err, res) => {
        if (err) {
          console.log(err);
          return;
        }
        console.log('grid saved');
        console.log(res);
      });
    },
    loadGrid: function() {
      if (!this.gridLoading) {
        this.gridLoading = true;
        let req = {id: this.data.id}; 
        post('loadGrid', req, (err, res) => {
          if (!err) {
            console.log('grid loaded');
            console.log(res);
            if (res) {
              this.numberOfLevels = res.numberOfLevels;
              this.priceStepPcnt = res.priceStepPcnt;
              this.priceHiLimitPcnt = res.priceHiLimitPcnt;
              this.priceLowLimitPcnt = res.priceLowLimitPcnt;
              this.initialPrice = res.initialPrice;
              this.priceLevels = res.priceLevels;
              this.tradingAmountPcnt = res.tradingAmountPcnt;
              this.tradingStartTime = res.tradingStartTime;
            }
          } else {
            console.log(err);
          }
          this.gridLoading = false;
        });
      }
    },
    saveSpot: function() {
      let spot = this.spot;
      post('saveSpot', { id: this.data.id, spot: spot }, (err, res) => {
        console.log('saving SPOT');
        console.log(res);
      });
    },
    loadSpot: function() {
      let req = {id: this.data.id}; 
      post('loadSpot', req, (err, res) => {
        if (err) {
          console.log(err);
          return;
        }
        console.log('spot loaded');
        console.log(res);
        if (res) {
          this.config.candleSize = res.candleSize;
          this.chartDateRangeDays = res.chartDateRangeDays;
          this.watcher.config.watch.asset = res.asset;
          this.watcher.config.watch.currency = res.currency;
          this.watcher.config.watch.exchange = res.exchange;
        }
      });
    },
    loadOrders: function() {
      let req = {id: this.data.id}; 
      this.loadingOrders = true;
      post('loadOrders', req, (err, res) => {
        if (!err) {
          //console.log('loadOrders: ', res);
          if (res) {
            if (res.length) {
              console.log(res.length + ' orders loaded');
              let markers = [];
              _.each(res, (order) => {
                let cond = this.getOrderFilterCondition(order);
                if (cond) {
                  let orderMarker = {};
                  orderMarker.time = moment(order.time).unix();
                  orderMarker.position = 'inBar';
                  orderMarker.shape = 'circle';
                  if (order.side === 'SELL') {
                    orderMarker.size = 3;  
                    orderMarker.color = '#d18902';
                    orderMarker.text = '      ';
                    if (order.status === 'NEW') {
                      orderMarker.text += 'N';
                    } else if (order.status === 'FILLED') {
                      orderMarker.text += 'F';
                    }
                    orderMarker.text += 'S ' + Number(order.origQty).toFixed(1);
                  } else if (order.side === 'BUY') {
                    orderMarker.color = '#409612';
                    orderMarker.size = 2;
                    orderMarker.text = '       ';
                    if (order.status === 'NEW') {
                      orderMarker.text += 'N';
                    } else if (order.status === 'FILLED') {
                      orderMarker.text += 'F';
                    }
                    orderMarker.text += 'B ' + Number(order.origQty).toFixed(1);
                  }
                  markers.push(orderMarker);
                }
              });
              this.spotOrders = Object.freeze(markers);
            }
          }
        } else {
          console.log(err);
        }
        this.loadingOrders = false;
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
    testButtonOne: function() {
      //this.saveSpot();
      //this.numberOfLevels++;
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'testWithArgsAction',
          args: ['bdshjvfh bvfhsbf ...']
        }
      }
      post('pipelineAction', req, (err, res) => {
        console.log('testWithArgsAction: ', res);
      });
    },
    testButtonTwo: function() {
      console.log('this.$store.state:');
      console.log(this.$store.state);
      //console.log('this.data ', this.data);
      // console.log('getGridLevels');
      // post('getGridLevels', { id: this.data.id }, (err, res) => {
      //   console.log('getGridLevels result');
      //   console.log(res);
      // });
    },
    spotBuy: function() {
      let params = {
        id: this.data.id,
        params: {
          side: 'buy',
          amount: this.buyAssetAmount
        }
      };
      post('createOrder', { id: this.data.id, params: params}, (err, res) => {
        if (err) {
          console.log('error: ', err);
        } else {
          console.log('createOrder');
        }
      });
    },
    spotSell: function() {

    },
    spotOrderSell: function(orderId) {
      console.log('selling ordder ', orderId);
    },
    spotOrderCancel: function(orderId) {
      console.log('canceling order ', orderId);
    },
    getBalances: function() {
      post('getBalances', { id: this.data.id }, (err, res) => {
        console.log('BALANCES result');
        console.log(res);
        if (err) {
          console.log('error: ', err);
        } else if (res) {
          this.balances = res;
        }
      });
    },
    loadOrdersAdvanced: function() {
      post('loadOrdersAdvanced', { id: this.data.id }, (err, res) => {
        console.log('loadOrdersAdvanced result');
        console.log(res);
        if (err) {
          console.log('error: ', err);
        } 
        console.log('loadOrdersAdvanced DATA: ', this.data);
      });
    },
    getTicker: function() {
      post('getTicker', { id: this.data.id }, (err, res) => {
        console.log('getTicker result');
        console.log(res);
        if (err) {
          console.log('error: ', err);
        }
        console.log('getTicker DATA: ', this.data);
      });
    },
    changeNumberOfLevels: function(value) {
      this.numberOfLevels = value;
      //console.log(this.numberOfLevels);
      this.priceStepPcnt = this.calcPriceStepPcnt(this.initialPrice, this.numberOfLevels, this.priceLowLimitPcnt, this. priceHiLimitPcnt);
      this.updateGridChart();
    },
    changePriceStepPcnt: function(value) {
      this.priceStepPcnt = value;
      this.numberOfLevels = this.calcNumOfLevels(this.initialPrice, this.priceStepPcnt, this.priceLowLimitPcnt, this. priceHiLimitPcnt);
      console.log('numberOfLevels', this.numberOfLevels);
      this.updateGridChart();
    },
    changePriceHiLimitPcnt: function(value) {
      this.priceHiLimitPcnt = value;
      let result = this.calcPriceLevels(this.initialPrice, this.numberOfLevels, this.priceLowLimitPcnt, this. priceHiLimitPcnt);
      //console.log(this.priceHiLimitPcnt);
      this.priceStepPcnt = result.levelPricePcnt;
      this.updateGridChart();
    },
    changePriceLowLimitPcnt: function(value) {
      this.priceLowLimitPcnt = value;
      let result = this.calcPriceLevels(this.initialPrice, this.numberOfLevels, this.priceLowLimitPcnt, this. priceHiLimitPcnt);
      this.priceStepPcnt = result.levelPricePcnt;
      this.updateGridChart();
    },
    changeTradingAmountPcnt: function(value) {
      this.tradingAmountPcnt = value;
      this.tradingDepositAmount = this.calcTradingDepositAmount(
        this.exchangePortfolioCurrencyAmount,
        this.tradingAmountPcnt
      );
    },
    changeCandleSize: function(size) {
      this.config.candleSize = size;
    },
    
    updateGridChart: function() {
      let result = this.calcPriceLevels(this.initialPrice, this.numberOfLevels, this.priceLowLimitPcnt, this. priceHiLimitPcnt);
      this.priceLevels = Object.freeze(result.levels);
      console.log('this.priceLevels');
      console.log(this.priceLevels);
      //this.$emit('setPriceLevels', this.priceLevels);
    },
    calcPriceLevels: function(initialPrice, numberOfLevels, priceLowLimitPcnt, priceHiLimitPcnt) {
      let result = {};
      let priceRangeDiff = this.calcPriceRangeDiff(initialPrice, priceLowLimitPcnt, priceHiLimitPcnt);
      let rangeLowerPrice = initialPrice - ((initialPrice / 100) * priceLowLimitPcnt);
      //console.log(priceRangeDiff);
      let levelPrice;
      levelPrice = priceRangeDiff / numberOfLevels;
      //console.log(levelPrice);
      let levels = new Array(numberOfLevels);
      let levelIndx;
      for (levelIndx = 0; levelIndx < numberOfLevels; levelIndx++) {
        levels[levelIndx] = rangeLowerPrice + levelPrice + (levelPrice * levelIndx);
      }
      let levelPricePcnt = levelPrice / (initialPrice / 100);
      result.levelPrice = levelPrice;
      result.levelPricePcnt = levelPricePcnt;
      result.levels = levels;
      return result;
    },
    calcNumOfLevels: function(initialPrice, priceStepPcnt, priceLowLimitPcnt, priceHiLimitPcnt) {
      let priceRangeDiff = this.calcPriceRangeDiff(initialPrice, priceLowLimitPcnt, priceHiLimitPcnt);
      //console.log('priceRangeDiff', priceRangeDiff);
      let levelPrice;
      levelPrice = (priceRangeDiff / 100) * priceStepPcnt;
      //console.log('levelPrice', levelPrice);
      
      let numberOfLevels = priceRangeDiff / levelPrice;
      if (numberOfLevels > 30) {
        numberOfLevels = 30;
      }
      //console.log('numberOfLevels', numberOfLevels);
      return (numberOfLevels).toFixed(0);
    },
    calcPriceStepPcnt: function(initialPrice, numberOfLevels, priceLowLimitPcnt, priceHiLimitPcnt) {
      let priceRangeDiff = this.calcPriceRangeDiff(initialPrice, priceLowLimitPcnt, priceHiLimitPcnt);
      let levelPrice;
      levelPrice = priceRangeDiff / numberOfLevels;
      let priceStepPcnt = 100 / (priceRangeDiff / levelPrice);
      //console.log('priceStepPcnt', priceStepPcnt);
      if (priceStepPcnt > 40) {
        priceStepPcnt = 40;
      }
      return priceStepPcnt;
    },
    calcPriceStep: function(numberOfLevels) {
      let priceRangeDiff = this.calcPriceRangeDiff();
      let levelPrice;
      levelPrice = priceRangeDiff / numberOfLevels;
      if (levelPrice > 1) {
        return (levelPrice).toFixed(2);
      } else {
        return (levelPrice).toFixed(6);
      }
    },
    calcPriceRangeDiff: function(initialPrice, priceLowLimitPcnt, priceHiLimitPcnt) {
      let upperPrice = initialPrice + ((initialPrice / 100) * priceHiLimitPcnt);
      let lowerPrice = initialPrice - ((initialPrice / 100) * priceLowLimitPcnt);
      let priceRangeDiff = upperPrice - lowerPrice;
      return priceRangeDiff;
    },
    calcTradingDepositAmount: function(exchangePortfolioCurrencyAmount, tradingAmountPcnt) {
      let tradingDepositAmount = (exchangePortfolioCurrencyAmount / 100) * tradingAmountPcnt;
      return tradingDepositAmount;
    }
  }
}
</script>

<style>
</style>
