// Redux/vuex inspired reducer, reduces an event into a gekko state.
// NOTE: this is used by the backend as well as the frontend.

const skipInitialEvents = ['marketUpdate'];
const skipLatestEvents = ['marketStart', 'stratWarmupCompleted'];


const reduce = (state, event) => {
  const type = event.type;
  const payload = event.payload;
  //console.log(state.events);
  state = {
    ...state,
    latestUpdate: new Date()
  }
  //console.log(state.events);
  //console.log('Reduce: type ', type);
  if (type === 'getLocalOrders') {
    //state.localOrders = payload;
    //console.log('state getLocalOrders ', payload);
    state = {
      ...state,
      localOrders: payload
    }
  }
  //console.log(state.events);
  if (!state.events[type]) {
    //console.log('Reduce events: ', type);
    //console.log('payload: ', payload);
    state = {
      ...state,
      events: {
        ...state.events,
        [type]: [ payload ]
      }
    }
  } else {
    state = {
      ...state,
      events: {
        ...state.events,
        [type]: [ ...state.events[type], payload ]
      }
    }
  }
  //console.log(state.events);
  if (state.events && !state.events.initial[type] && !skipInitialEvents.includes(type)) {
    state = {
      ...state,
      events: {
        ...state.events,
        initial: {
          ...state.events.initial,
          [type]: payload
        }
      }
    }
  }
  //console.log(state.events);
  if (!skipLatestEvents.includes(type)) {
    state = {
      ...state,
      events: {
        ...state.events,
        latest: {
          ...state.events.latest,
          [type]: payload
        }
      }
    }
  }
  //console.log(state.events);
  return state;
}

// export default reduce;
module.exports = reduce;