// Redux/vuex inspired reducer, reduces an event into a gekko state.
// NOTE: this is used by the backend as well as the frontend.

const skipInitialEvents = ['marketUpdate'];
const skipLatestEvents = ['marketStart', 'stratWarmupCompleted'];

const reduce = (state, event) => {
  const type = event.type;
  const payload = event.payload;
  state = {
    ...state,
    latestUpdate: new Date()
  }
  if (type === 'orders') {
    state = {...state, orders: payload};
  } else if (type === 'loadInitialBalancesAction') {
    state = {...state, initialBalances: payload};
  } else if (type === 'getBalancesAction') {
    state = {...state, balances: payload};
  } else if (type === 'getTickerAction') {
    state = {...state, ticker: payload};
  } else if (type === 'sellAction') {
    state = {...state, lastOrderIds: payload};
  } else if (type === 'buyAction') {
    state = {...state, lastOrderIds: payload};
  } else if (type === 'sellOrderByIdAction') {
    state = {...state, lastOrderIds: payload};
  } else if (type === 'traderError') {
    state = {...state, traderErrorMessage: payload};
  } else if (type === 'saveInitialBalancesAction') {
    state = {...state, initialBalances: payload};
  } else if (type === 'loadSettingsAction') {
    state = {...state, settings: payload};
  } else if (type === 'saveSettingsAction') {
    state = {...state, saveSettingsActionResult: payload};
  } else if (type === 'buy') {
    state = {...state, lastOrderIds: payload};
  } else if (type === 'sell') {
    state = {...state, lastOrderIds: payload};
  } else if (type === 'sellMultiple') {
    state = {...state, lastOrderIds: payload};
  } else if (type === 'sellAndBuy') {
    state = {...state, lastOrderIds: payload};
  } else if (type === 'sellMultipleAndBuy') {
    state = {...state, lastOrderIds: payload};
  } else if (type === 'lastTimeCheckPrice') {
    state = {...state, lastTimeCheckPrice: payload};
  } else {
    if (!state.events[type]) {
      state = {...state, events: {...state.events, [type]: [ payload ]}}
    } else {
      state = {...state, events: {...state.events, [type]: [ ...state.events[type], payload ]}};
    }
    if (state.events && !state.events.initial[type] && !skipInitialEvents.includes(type)) {
      state = {...state, events: {...state.events, initial: {...state.events.initial, [type]: payload}}};
    }
    if (!skipLatestEvents.includes(type)) {
      state = {...state, events: {...state.events, latest: {...state.events.latest, [type]: payload}}};
    }
  }
  // if (state.orders && state.orders.length) {
  //   state.orders.reverse();
  // }
  return state;
}

// export default reduce;
module.exports = reduce;