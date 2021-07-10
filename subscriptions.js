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
    event: 'orders',
    handler: 'processOrders'
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
    event: 'buyAction',
    handler: 'processBuyAction'
  },
  {
    emitter: ['trader'],
    event: 'sellAction',
    handler: 'processSellAction'
  },
  {
    emitter: ['trader'],
    event: 'sellOrderByIdAction',
    handler: 'processSellOrderByIdAction'
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
    event: 'testWithArgsAction',
    handler: 'processTestWithArgsAction'
  },
  {
    emitter: ['trader'],
    event: 'lastTimeCheckPrice',
    handler: 'processLastTimeCheckPrice'
  },
  {
    emitter: ['trader'],
    event: 'tradingEnabled',
    handler: 'processTradingEnabled'
  },
  {
    emitter: ['trader'],
    event: 'realOrdersEnabled',
    handler: 'processRealOrdersEnabled'
  }
  
];

module.exports = subscriptions;