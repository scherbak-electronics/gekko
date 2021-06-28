// 
// Subscriptions glue plugins to events
// flowing through the Gekko.
// 

var subscriptions = [
  {
    emitter: 'market',
    event: 'candle',
    handler: 'processCandle'
  },
  {
    emitter: 'market',
    event: 'marketUpdate',
    handler: 'processMarketUpdate'
  },
  {
    emitter: 'market',
    event: 'marketStart',
    handler: 'processMarketStart'
  },
  // {
  //   emitter: 'tradingAdvisor',
  //   event: 'stratWarmupCompleted',
  //   handler: 'processStratWarmupCompleted'
  // },
  // {
  //   emitter: 'tradingAdvisor',
  //   event: 'advice',
  //   handler: 'processAdvice'
  // },
  // {
  //   emitter: 'tradingAdvisor',
  //   event: 'candleMarker',
  //   handler: 'processCandleMarker'
  // },
  
  // {
  //   emitter: 'tradingAdvisor',
  //   event: 'chartLine',
  //   handler: 'processChartLine'
  // },
  
  // {
  //   emitter: 'tradingAdvisor',
  //   event: 'chartPriceLine',
  //   handler: 'processChartPriceLine'
  // },
  
  // {
  //   emitter: 'tradingAdvisor',
  //   event: 'chartHistogram',
  //   handler: 'processChartHistogram'
  // },
  
  // {
  //   emitter: 'tradingAdvisor',
  //   event: 'chartArea',
  //   handler: 'processChartArea'
  // },
  
  // {
  //   emitter: 'tradingAdvisor',
  //   event: 'chartStatistics',
  //   handler: 'processChartStatistics'
  // },
  // {
  //   emitter: 'tradingAdvisor',
  //   event: 'updatePriceGrid',
  //   handler: 'processUpdatePriceGrid'
  // },
  // {
  //   emitter: 'tradingAdvisor',
  //   event: 'stratCandle',
  //   handler: 'processStratCandle'
  // },
  // {
  //   emitter: 'tradingAdvisor',
  //   event: 'stratUpdate',
  //   handler: 'processStratUpdate'
  // },
  // {
  //   emitter: 'tradingAdvisor',
  //   event: 'stratNotification',
  //   handler: 'processStratNotification'
  // },
  {
    emitter: ['trader'],
    event: 'setOrders',
    handler: 'processSetOrders'
  },
  {
    emitter: ['trader'],
    event: 'tradeInitiated',
    handler: 'processTradeInitiated'
  },
  {
    emitter: ['trader'],
    event: 'tradeAborted',
    handler: 'processTradeAborted'
  },
  {
    emitter: ['trader'],
    event: 'tradeCompleted',
    handler: 'processTradeCompleted'
  },
  // {
  //   emitter: ['trader'],
  //   event: 'tradeCancelled',
  //   handler: 'processTradeCancelled'
  // },
  {
    emitter: ['trader'],
    event: 'tradeErrored',
    handler: 'processTradeErrored'
  },
  {
    emitter: ['trader'],
    event: 'portfolioChange',
    handler: 'processPortfolioChange'
  },
  {
    emitter: ['trader'],
    event: 'portfolioValueChange',
    handler: 'processPortfolioValueChange'
  },
  {
    emitter: ['trader'],
    event: 'getTickerAction',
    handler: 'processGetTickerAction'
  },
  {
    emitter: ['trader'],
    event: 'getOrdersAction',
    handler: 'processGetOrdersAction'
  },
  {
    emitter: ['trader'],
    event: 'getBalancesAction',
    handler: 'processGetBalancesAction'
  },
  {
    emitter: ['trader'],
    event: 'sellAction',
    handler: 'processSellAction'
  },
  {
    emitter: ['trader'],
    event: 'testWithArgsAction',
    handler: 'processTestWithArgsAction'
  },
  {
    emitter: ['trader'],
    event: 'saveInitialBalancesAction',
    handler: 'processSaveInitialBalancesAction'
  },
  {
    emitter: ['trader'],
    event: 'loadInitialBalancesAction',
    handler: 'processLoadInitialBalancesAction'
  },
  {
    emitter: ['trader'],
    event: 'getOrdersAction',
    handler: 'processGetOrdersAction'
  },
  {
    emitter: ['trader'],
    event: 'saveSettingsAction',
    handler: 'processSaveSettingsAction'
  },
  {
    emitter: ['trader'],
    event: 'loadSettingsAction',
    handler: 'processLoadSettingsAction'
  },
  {
    emitter: ['trader'],
    event: 'traderError',
    handler: 'processTraderError'
  }
  
  // {
  //   emitter: 'performanceAnalyzer',
  //   event: 'performanceReport',
  //   handler: 'processPerformanceReport'
  // },
  // {
  //   emitter: 'performanceAnalyzer',
  //   event: 'roundtripUpdate',
  //   handler: 'processRoundtripUpdate'
  // },
  // {
  //   emitter: 'performanceAnalyzer',
  //   event: 'roundtrip',
  //   handler: 'processRoundtrip'
  // },
];

module.exports = subscriptions;