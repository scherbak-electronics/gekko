const _ = require('lodash');
const cache = require('../state/cache');
const gekkoManager = cache.get('gekkos');

module.exports = function *() {
  let id = this.request.body.id;
  const response = gekkoManager.loadSpot(id);
  this.body = response;
}
