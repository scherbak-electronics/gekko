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
    console.log('State: payload len: ', payload.length);
    if (payload && payload.length) {
      state = {...state, orders: payload};
    } else {
      state = {...state, orders: payload};
    }
  } else if (type === 'loadInitialBalancesActionResponse') {
    state = {...state, initialBalances: payload};
  } else if (type === 'getBalancesActionResponse') {
    state = {...state, balances: payload};
  } else if (type === 'getTickerActionResponse') {
    state = {...state, ticker: payload};
  } else if (type === 'sellActionResponse') {
    state = {...state, lastOrderIds: payload};
  } else if (type === 'buyActionResponse') {
    state = {...state, lastOrderIds: payload};
  } else if (type === 'traderError') {
    state = {...state, traderErrorMessage: payload};
  } else if (type === 'traderSuccess') {
    state = {...state, traderSuccessMessage: payload};
  } else if (type === 'saveInitialBalancesActionResponse') {
    state = {...state, initialBalances: payload};
  } else if (type === 'loadSettingsActionResponse') { 
    state = {...state, settings: payload};
  } else if (type === 'saveSettingsActionResponse') { 
    state = {...state, settings: payload};
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