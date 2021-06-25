const _ = require('lodash');
const cache = require('../state/cache');
const gekkoManager = cache.get('gekkos');

module.exports = function *() {
  let id = this.request.body.id;
  let response = {};
  if (id) {
    response = gekkoManager.loadOrdersPipelineAction(id);
  }
  this.body = response;
}
