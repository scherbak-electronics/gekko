import Vue from 'vue'
import _ from 'lodash';
const reduceState = require('../../../../../state/reduceState');

export const syncDevinfo = (state, data) => {
  if(!data) {
    return state;
  }
  state.devinfo = data;
  return state;
}

export const addDevinfo = (state, devinfo) => {
  state.devinfo = {
    ...state.devinfo,
    [devinfo.id]: devinfo
  }
  return state;
}

export const updateDevinfo = (state, update) => {
  if(!update.id || !_.has(state.devinfo, update.id)) {
    return console.error('cannot update unknown devinfo..');
  }

  state.devinfo = {
    ...state.devinfo,
    [update.id]: reduceState(state.devinfo[update.id], update.event)
  }
  return state;
}
