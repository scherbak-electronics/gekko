<template lang='pug'>
  div.my2
    .contain(v-if='!data')
      p Unknown SECO instance: SECO doesn't know what gekko this is...
    div(v-if='data')
      div(v-if='data.errorMessage', class='contain brdr--mid-gray p1 bg--orange')
        | This is SECO crashed with the following error: {{ data.errorMessage }}
      .grd.contain
        .grd-row
          .grd-row-col-6-6
            span {{ config.watch.exchange }}: {{ config.watch.asset }} / {{ config.watch.currency }} | 
            span days: {{ chartDateRangeDays }} | 
            span candle size: {{ candleSize }} | 
            span price: {{ price }} | 
            span last: {{ lastStepAskPrice }} | 
            span ask: {{ ticker.ask }} | bid: {{ ticker.bid }} 
        .grd-row
          .grd-row-col-3-6.left-panel-col(v-bind:class="{ 'dancer-candles': isDancerCandles, 'dancer-orders': isDancerOrders}")
            chart(:data='chartData', :candleSize='candleSize', :timeRange='chartDateRangeDays', :priceLevels='priceLevels' :spotOrders='spotOrders' v-on:changeTimeRange='changeTimeRange' v-on:changeCandleSize='changeCandleSize' :height='300' :width='480') 
            .grd-row
              .grd-row-col-6-6
                a.w100--s.btn--primary-m(href='#', v-on:click.prevent='getOrders') show orders
                a.w100--s.btn--primary-m(href='#', v-on:click.prevent='getOrdersOpened') show opened
                a.w100--s.btn--primary-m(href='#', v-on:click.prevent='getOrdersClosedBuy') show closed buy
                a.w100--s.btn--primary-m(href='#', v-on:click.prevent='getOrdersClosedSell') show closed sell
                a.w100--s.btn--primary-m(href='#', v-on:click.prevent='reloadChart') re-load chart
            .grd-row  
              .grd-row-col-6-6(v-bind:class="{ 'dancer': isDancer }")
                p .
          .grd-row-col-3-6.right-panel-col(v-bind:class="{ 'dancer': isDancer }")
            .grd-row.dashboard-params(v-bind:class="{ 'dancer': isDancer }")
              .grd-row-col-2-6
                h2 {{ currencyBalanceAmount }}$
                p {{ config.watch.currency }}   
              .grd-row-col-2-6
                h2 {{ assetBalanceAmountInCurrency }}$
                p {{ config.watch.asset }} 
                  strong ({{ assetBalanceAmount }} {{ config.watch.asset }})
              .grd-row-col-2-6
                h2 {{ ordersTotalCurrencyProfit }}$
                p {{ config.watch.currency }} profit in orders 
            .grd-row.dashboard-params(v-bind:class="{ 'dancer': isDancer }")
              .grd-row-col-1-6
                h3 {{ tradingAvailableCurrencyBalanceAmount }}$
                p {{ config.watch.currency }} trading
              .grd-row-col-1-6
                h3 {{ stepCurrencyAmount }}$
                p {{ config.watch.currency }} step
              .grd-row-col-1-6
                h3 {{ priceStepPcnt }}%
                p step size % (price change)
              .grd-row-col-1-6
                h3 0.00
                pt test avail. for
              .grd-row-col-1-6
                h3 {{ tradingCurrencyProfitPcnt }}
                p % of {{ config.watch.currency }} profit avail. for trading
              .grd-row-col-1-6
                h3 0.00
                p test fbeabr kaa wrbv
            .grd-row.dashboard-ctrl-params
              .grd-row-col-1-6
                p {{ tradingCurrencyBalancePcnt }}%
              .grd-row-col-1-6
                p {{ stepAmountPcnt }}% 
              .grd-row-col-1-6
                p {{ priceStepPcnt }}%
              .grd-row-col-1-6
                p -
              .grd-row-col-1-6
                p {{ tradingCurrencyProfitPcnt }}%
            .grd-row.dashboard-ctrl
              .grd-row-col-1-6                
                faderPcnt100(v-model='tradingCurrencyBalancePcnt', v-on:changeFaderPcnt100='changeTradingCurrencyBalancePcnt')
              .grd-row-col-1-6                
                faderStepAmountPcnt(v-model='stepAmountPcnt', v-on:changeStepAmountPcnt='changeStepAmountPcnt')  
              .grd-row-col-1-6                
                faderPriceStepPcnt(v-model='priceStepPcnt', v-on:changePriceStepPcnt='changePriceStepPcnt')
              .grd-row-col-1-6
                p -
              .grd-row-col-1-6                
                faderPcnt100(v-model='tradingCurrencyProfitPcnt', v-on:changeFaderPcnt100='changeTradingCurrencyProfitPcnt')                  
            .grd-row.dashboard-ctrl-labels       
              .grd-row-col-1-6
                p % of currency avail. for trading
              .grd-row-col-1-6
                p % of trading balance for one step
              .grd-row-col-1-6
                p price step %
              .grd-row-col-1-6
                p -
              .grd-row-col-1-6
                p % of orders total profit avail. for trading
            .grd-row
              .grd-row-col-6-6
                a.w100--s.btn--primary-m(href='#', v-on:click.prevent='saveSettings') save settings
                a.w100--s.btn--primary-m(href='#', v-on:click.prevent='loadSettings') load settings
                a.w100--s.btn--primary-m(href='#', v-on:click.prevent='getBalances') get balances
            .grd-row
              .grd-row-col-3-6
                div.input-checkbox
                  input(type='checkbox' id='is_real_order_enabled' v-model='isRealOrdersEnabled')
                  strong enable orders
                div.input-checkbox
                  input(type='checkbox' id='is_trading_enabled' v-model='isTradingEnabled')
                  strong enable trading
                div.input-checkbox
                  input(type='checkbox' id='buy_only_if_goes_down' v-model='isBuyOnlyIfGoesDownEnabled')
                  strong buy only if goes down
                div.input-checkbox
                  input(type='checkbox' id='sell_only_mode' v-model='isSellOnlyModeEnabled')
                  strong sell only mode   
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
                a.w100--s.btn--primary-m(href='#', v-on:click.prevent='buy') buy {{ config.watch.asset }}
                a.w100--s.btn--primary-m(href='#', v-on:click.prevent='sell') sell {{ config.watch.asset }}   
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
import faderPcnt100 from '../global/gridFader/pcnt100';
import spotOrdersList from './orders';

export default {
  created: function() {
    if(!this.isLoading) {
      this.getCandles();
    }
    this.updatePageTitle();
  },
  components: {
    spinner,
    chart,
    spotOrdersList,
    rangeCreator,
    faderPriceStepPcnt,
    faderStepAmountPcnt,
    faderPcnt100
  },
  data: function() {
    return {
      price: 0,
      lastStepPrice: 0,
      lastStepAskPrice: 0,
      candleFetch: 'idle',
      candles: false,
      range: {},
      chartDateRangeDays: 14,
      candleSize: 1,
      ticker: {},
      orders: [],
      spotOrders: [],
      lastOrderIds: false,
      priceStepPcnt: 0,
      stepAmountPcnt: 0,
      currencyTotal: 0,
      assetAmount: 0,
      loadingOrders: false,
      isDancer: false,
      isDancerOrders: false,
      isDancerCandles: false,
      isRealOrdersEnabled: false,
      isTradingEnabled: false,
      isBuyOnlyIfGoesDownEnabled: false,
      isSellOnlyModeEnabled: false,
      currencyBalanceAmount: 0,
      assetBalanceAmount: 0,
      tradingCurrencyBalancePcnt: 0,
      tradingCurrencyProfitPcnt: 0,
      tradingAvailableCurrencyBalanceAmount: 0,
      stepCurrencyAmount: 0,
      reloadSettings: true
    }
  },
  computed: {
    assetBalanceAmountInCurrency: function() {
      if (this.assetBalanceAmount) {
        if (this.ticker && this.ticker.bid) {
          return Number(this.assetBalanceAmount * this.ticker.bid).toFixed(2);
        }
      }
      return 0;
    },
    tradingCurrencyBalanceAmount: function() {
      if (this.currencyBalanceAmount) {
        if (this.tradingCurrencyBalancePcnt) {
          return Number((this.currencyBalanceAmount / 100) * this.tradingCurrencyBalancePcnt).toFixed(2);
        } 
      }
      return 0;
    },
    ordersTotalCurrencyProfit: function() {
      if (this.data && this.data.balances && this.data.balances.ordersTotalCurrencyProfit) {
        return Number(this.data.balances.ordersTotalCurrencyProfit).toFixed(2);
      }
      return 0;
    },
    stepAmount: function() {
      if (this.tradingCurrencyBalanceAmount) {
        return Number((this.tradingCurrencyBalanceAmount / 100) * this.stepAmountPcnt).toFixed(2);
      }
      return 0;
    },
    id: function() {
      return this.$route.params.id;
    },
    gekkos: function() {
      return this.$store.state.gekkos;
    },
    data: function() {
      // console.log('this.gekkos[this.id] = ', this.gekkos[this.id]);
      if(!this.gekkos) {
        return false;
      }
      if(_.has(this.gekkos, this.id)) {
        //console.log('computed data:');
        //console.log(this.gekkos[this.id]);
        return this.gekkos[this.id];
      }
      return false;
    },
    config: function() {
      return _.get(this, 'data.config');
    },
    type: function() {
      return this.data.logType;
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
    isLoadingCandles: function() {
      if (this.candleFetch === 'fetched') {
        return false;
      } else {
        return true;
      }
    }
  },
  watch: {
    'data.config.watch.asset': function() {
      this.updatePageTitle();
    },
    'data.balances.assetBalance.amount': function(value) { this.assetBalanceAmount = Number(value).toFixed(2); },
    'data.balances.currencyBalance.amount': function(value) { this.currencyBalanceAmount = Number(value).toFixed(2); },
    'data.balances.tradingAvailableCurrencyBalancePcnt': function(value) { this.tradingCurrencyBalancePcnt = value; },
    'data.balances.tradingAvailableCurrencyProfitPcnt': function(value) { this.tradingCurrencyProfitPcnt = value; },
    'data.balances.ordersTotalCurrencyProfit': function(value) {

    },
    'data.events.latest.candle.start': function() {
      this.updateRange();
      setTimeout(this.getCandles, 200);
    },
    'data.events.latest.candle.close': function(price) { this.price = price; },
    'data.ticker': function(ticker) {
      //console.log('data.ticker: ', ticker);
      this.updatePageTitle();
      this.ticker = ticker;
      this.price = this.ticker.ask;
      this.updateChartPriceLines(this.lastStepAskPrice);
      this.isDancer = false;
    },
    'data.orders': function(orders) {
      //console.log('data.localOrders ', orders);
      this.orders = orders;
      this.spotOrders = orders;
      this.isDancerOrders = false;
    },
    currencyTotal: function(total) {
      if (this.price && this.price > 0) {
        this.assetAmount = Number(total / this.price).toFixed(2);
      }
    },
    assetAmount: function(amount) {
      setTimeout(() => {this.currencyTotal = Number(amount * this.price).toFixed(2)}, 1000);
    },
    'data.settings.stepCurrencyAmount': function(value) { this.stepCurrencyAmount = value; }, 
    'data.settings.tradingAvailableCurrencyBalanceAmount': function(value) { this.tradingAvailableCurrencyBalanceAmount = value; }, 
    'data.settings.tradingAvailableCurrencyBalancePcnt': function(value) { this.tradingCurrencyBalancePcnt = value; },
    'data.settings.tradingAvailableCurrencyProfitPcnt': function(value) { this.tradingCurrencyProfitPcnt = value; },
    'data.settings.stepAmountPcnt': function(value) {
      this.stepAmountPcnt = value;
      this.isDancer = false;
      this.updateChartPriceLines(this.lastStepAskPrice);
    },
    'data.settings.priceStepPcnt': function(value) {
      this.priceStepPcnt = value;
      //console.log('priceStepPcnt ', value);
      this.isDancer = false;
      this.updateChartPriceLines(this.lastStepAskPrice);
    },
    'data.settings.chartDateRangeDays': function(value) {
      console.log('data.settings.chartDateRangeDays: %s', value);
      this.chartDateRangeDays = value;
      this.updateRange();
      this.getCandles();
      this.isDancer = false;
    },
    'data.settings.candleSize': function(value) {
      console.log('data.settings.candleSize: %s', value);
      this.candleSize = value;
      this.getCandles();
      this.isDancer = false;
    },
    'data.settings.tradingEnabled': function(value) {
      console.log('data.settings.tradingEnabled: %s', value);
      this.isTradingEnabled = value;
      this.isDancer = false;
    },
    'data.settings.realOrdersEnabled': function(value) {
      console.log('data.settings.realOrdersEnabled: %s', value);
      this.isRealOrdersEnabled = value;
      this.isDancer = false;
    },
    'data.settings.buyOnlyIfGoesDownMode': function(value) {
      console.log('data.settings.buyOnlyIfGoesDownMode: %s', value);
      this.isBuyOnlyIfGoesDownEnabled = value;
      this.isDancer = false;
    },
    'data.settings.sellOnlyMode': function(value) {
      console.log('data.settings.sellOnlyMode: %s', value);
      this.isSellOnlyModeEnabled = value;
      this.isDancer = false;
    },
    isTradingEnabled: function(value) {
      this.trading(value);
    },
    isRealOrdersEnabled: function(value) {
      this.realOrders(value);
    },
    isBuyOnlyIfGoesDownEnabled: function(value) {
      this.buyOnlyIfGoesDown(value);
    },
    isSellOnlyModeEnabled: function(value) {
      this.sellOnlyMode(value);
    },
    'data.lastOrderIds': function(lastOrderIds) {
      this.lastOrderIds = lastOrderIds;
    },
    'data.lastTimeCheckPrice': function(value) {
      //console.log('data.lastTimeCheckPrice');
      if (value) {
        this.lastStepPrice = value.lastStepPrice;
        this.lastStepAskPrice = value.lastStepAskPrice;
        this.updateChartPriceLines(this.lastStepAskPrice);
      }
    } 
  },
  methods: {
    updatePageTitle: function() {
      let pageTitle = '';
      if (this.config.watch.asset) {
        pageTitle = this.config.watch.asset;
        if (this.ordersTotalCurrencyProfit) {
          pageTitle += '  -  ' + this.ordersTotalCurrencyProfit + '$';
        }
        window.document.title = pageTitle;
      }
    },
    clearAllSettings: function() {
      let settings = {};
      settings.stepAmountPcnt = 0;
      settings.priceStepPcnt = 0;
      settings.candleSize = 0;
      settings.chartDateRangeDays = 0;
      settings.tradingEnabled = false;
      settings.realOrdersEnabled = false;
      settings.buyOnlyIfGoesDownMode = false;
      settings.sellOnlyMode = false;
      settings.tradingAvailableCurrencyBalancePcnt = 0;
      settings.tradingAvailableCurrencyProfitPcnt = 0;
      settings.stepCurrencyAmount = 0;
      this.data.settings = settings;
    },
    saveSettings: function() {
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'saveSettingsAction',
          args: [
            {
              buyOnlyIfGoesDownMode: this.isBuyOnlyIfGoesDownEnabled,
              sellOnlyMode: this.isSellOnlyModeEnabled,
              tradingEnabled: this.isTradingEnabled,
              realOrdersEnabled: this.isRealOrdersEnabled,
              priceStepPcnt: this.priceStepPcnt,
              stepAmountPcnt: this.stepAmountPcnt,
              candleSize: this.candleSize,
              chartDateRangeDays: this.chartDateRangeDays,
              tradingAvailableCurrencyBalancePcnt: this.tradingCurrencyBalancePcnt,
              tradingAvailableCurrencyProfitPcnt: this.tradingCurrencyProfitPcnt,
              tradingAvailableCurrencyBalanceAmount: this.tradingAvailableCurrencyBalanceAmount,
              stepCurrencyAmount: this.stepCurrencyAmount
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
      this.clearAllSettings();
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
    updateRange: function() {
      if (this.chartDateRangeDays) {
        let days = this.chartDateRangeDays;
        let now = moment().startOf('minute');
        let then = now.clone().subtract(days, 'd');
        this.range.to = this.fmt(now);
        this.range.from = this.fmt(then);
        //console.log('range is ', this.range);
        //this.$emit('config', this.config);
      }
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
      if (this.candleSize) {
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
              this.updateChartPriceLines(this.lastStepAskPrice);
            }
            this.candleFetch = 'fetched';
            if (this.reloadSettings) {
              this.loadSettings();
              this.getBalances();
              this.reloadSettings = false;
            }
            this.isDancerCandles = false;
          })
        }, 400);
      }
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
    getOrdersOpened: function() {
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'getOpenedOrdersAction',
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
    getOrdersClosedBuy: function() {
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'getClosedBuyOrdersAction',
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
    getOrdersClosedSell: function() {
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'getClosedSellOrdersAction',
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
    changeCandleSize: function(value) {
      this.data.config.candleSize = value;
      this.config.candleSize = value;
      this.candleSize = value;
      this.saveSettings();
    },
    changePriceStepPcnt: function(value) {
      console.log( this.currencyBalanceAmount);
      this.priceStepPcnt = value;
      this.updateChartPriceLines(this.lastStepAskPrice);
    },
    changeStepAmountPcnt: function(value) {
      this.stepAmountPcnt = value;
      if (this.tradingAvailableCurrencyBalanceAmount) {
        this.stepCurrencyAmount = Number((this.tradingAvailableCurrencyBalanceAmount / 100) * this.stepAmountPcnt).toFixed(2) / 1;
      }
    },
    changeTradingCurrencyBalancePcnt: function(value) {
      this.tradingCurrencyBalancePcnt = value;
      if (this.currencyBalanceAmount) {
        this.tradingAvailableCurrencyBalanceAmount = Number((this.currencyBalanceAmount / 100) * this.tradingCurrencyBalancePcnt).toFixed(2) / 1;
      }
    },
    changeTradingCurrencyProfitPcnt: function(value) {
      this.tradingCurrencyProfitPcnt = value;
    },
    updateChartPriceLines: function(value) {
      let stepBasePrice = value;
      if (!stepBasePrice) {
        if (this.price) {
          stepBasePrice = this.price;
        } else {
          if (this.ticker && this.ticker.ask) {
            stepBasePrice = this.ticker.ask;
          } else {
            stepBasePrice = 0;
          }
        }
      }
      let levels = this.calcPriceLevels(stepBasePrice, this.priceStepPcnt);
      levels.push({
        price: stepBasePrice, 
        color: '#3dbbff',
        lineStyle: 2
      }); 
      this.priceLevels = Object.freeze(levels);
    },
    calcPriceLevels: function(price, priceStepPcnt) {
      let levels = [];
      let stepPrice = (price / 100) * priceStepPcnt;
      let lowerPrice = price - stepPrice;
      let upperPrice = price + stepPrice;
      levels.push({
        price: lowerPrice, 
        color: '#a17e4d',
        title: '-' + priceStepPcnt + '%',
        lineStyle: 0,
        axisLabelVisible: true
      });
      levels.push({
        price: upperPrice, 
        color: '#407a3e',
        title: '+' + priceStepPcnt + '%',
        lineStyle: 0,
        axisLabelVisible: true
      });
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
    sellOnlyMode: function(isEnabled) {
      //console.log('selling ordder ', orderId);
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'sellOnlyModeAction',
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
    buyOnlyIfGoesDown: function(isEnabled) {
      //console.log('selling ordder ', orderId);
      let req = {
        pipelineId: this.data.id,
        pipelineAction: {
          name: 'buyOnlyIfGoesDownAction',
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
    },
    testButtonTwo: function() {
    }
  }
}
</script>

<style>
</style>
