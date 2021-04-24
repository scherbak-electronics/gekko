const _ = require('lodash');
const moment = require('moment');

const broadcast = require('./cache').get('broadcast');
const Logger = require('./logger');
const pipelineRunner = require('../../core/workers/pipeline/parent');
const reduceState = require('./reduceState.js');
const now = () => moment().format('YYYY-MM-DD HH:mm');

const DevinfoManager = function() {
  this.devinfo = {};
  this.instances = {};
}

DevinfoManager.prototype.add = function({data}) {
  const date = now().replace(' ', '-').replace(':', '-');
  const n = (Math.random() + '').slice(3);
  const id = `${date}-SECODEV-${n}`;
  // make sure we catch events happening inside te gekko instance
  const state = {
    data,
    date,
    n,
    id,
    start: moment()
  }

  this.devinfo[id] = state;

  // start the actual instance
  this.instances[id] = pipelineRunner(mode, config, this.handleRawEvent(id));

  // after passing API credentials to the actual instance we mask them
  if(logType === 'trader') {
    config.trader.key = '[REDACTED]';
    config.trader.secret = '[REDACTED]';
  }

  console.log(`${now()} SECO devinfo ${id} started.`);

  broadcast({
    type: 'devinfo_new',
    id,
    state
  });

  return state;
}

DevinfoManager.prototype.handleRawEvent = function(id) {
  return (err, event) => {
    if(err) {
      return this.handleFatalError(id, err);
    }
    if(!event) {
      return;
    }
    if(event.type) {
      this.handleGekkoEvent(id, event);
    }
  }
}

DevinfoManager.prototype.handleDevinfoEvent = function(id, event) {
  this.devinfo[id] = reduceState(this.devinfo[id], event);
  broadcast({
    type: 'devinfo_event',
    id,
    event
  });
}

DevinfoManager.prototype.handleFatalError = function(id, err) {
  const state = this.devinfo[id];
  if(!state || state.errored || state.stopped)
    return;

  state.errored = true;
  state.errorMessage = err;
  console.error('RECEIVED ERROR IN devinfo INSTANCE', id);
  console.error(err);
  broadcast({
    type: 'devinfo_error',
    id,
    error: err
  });
}

DevinfoManager.prototype.stop = function(id) {
  if(!this.devinfo[id])
    return false;

  console.log(`${now()} stopping devinfo ${id}`);

  this.devinfo[id].stopped = true;
  this.devinfo[id].active = false;

  // todo: graceful shutdown (via gekkoStream's
  // finish function).
  this.instances[id].kill();
  broadcast({
    type: 'devinfo_stopped',
    id
  });
  return true;
}

DevinfoManager.prototype.delete = function(id) {
  if(this.devinfo[id]) {
    throw new Error('Cannot delete a running Gekko, stop it first.');
  }
  console.log(`${now()} deleting devinfo ${id}`);
  broadcast({
    type: 'devinfo_deleted',
    id
  });
  return true;
}

DevinfoManager.prototype.list = function() {
  return { live: this.devinfo };
}

module.exports = DevinfoManager;