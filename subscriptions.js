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
    event: 'getTickerActionResponse',
    handler: 'processGetTickerAction'
  },
  
  {
    emitter: ['trader'],
    event: 'getBalancesActionResponse',
    handler: 'processGetBalancesAction'
  },
  {
    emitter: ['trader'],
    event: 'saveInitialBalancesActionResponse',
    handler: 'processSaveInitialBalancesAction'
  },
  {
    emitter: ['trader'],
    event: 'loadInitialBalancesActionResponse',
    handler: 'processLoadInitialBalancesAction'
  },
  {
    emitter: ['trader'],
    event: 'orders',
    handler: 'processOrders'
  },
  {
    emitter: ['trader'],
    event: 'saveSettingsActionResponse',
    handler: 'processSaveSettingsAction'
  },
  {
    emitter: ['trader'],
    event: 'loadSettingsActionResponse',
    handler: 'processLoadSettingsAction'
  },
  {
    emitter: ['trader'],
    event: 'buyActionResponse',
    handler: 'processBuyAction'
  },
  {
    emitter: ['trader'],
    event: 'sellActionResponse',
    handler: 'processSellAction'
  },
  
  {
    emitter: ['trader'],
    event: 'buy',
    handler: 'processBuy'
  },
  {
    emitter: ['trader'],
    event: 'sell',
    handler: 'processSell'
  },
  {
    emitter: ['trader'],
    event: 'sellMultiple',
    handler: 'processSellMultiple'
  },
  {
    emitter: ['trader'],
    event: 'sellAndBuy',
    handler: 'processSellAndBuy'
  },
  {
    emitter: ['trader'],
    event: 'sellMultipleAndBuy',
    handler: 'processSellMultipleAndBuy'
  },
  {
    emitter: ['trader'],
    event: 'traderError',
    handler: 'processTraderError'
  },
  {
    emitter: ['trader'],
    event: 'traderSuccess',
    handler: 'processTraderSuccess'
  },
  {
    emitter: ['trader'],
    event: 'lastTimeCheckPrice',
    handler: 'processLastTimeCheckPrice'
  },
  {
    emitter: ['trader'],
    event: 'tradingEnabledActionResponse',
    handler: 'processTradingEnabled'
  },
  {
    emitter: ['trader'],
    event: 'realOrdersEnabledActionResponse',
    handler: 'processRealOrdersEnabled'
  },
  {
    emitter: ['trader'],
    event: 'traderState',
    handler: 'processTraderState'
  },
  {
    emitter: ['trader'],
    event: 'sellOnlyModeActionResponse',
    handler: 'sellOnlyModeActionHandler'
  },
  {
    emitter: ['trader'],
    event: 'buyOnlyIfGoesDownActionResponse',
    handler: 'buyOnlyIfGoesDownActionHandler'
  },
  
  
];

module.exports = subscriptions;