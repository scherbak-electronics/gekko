const _ = require('lodash');
const cache = require('../state/cache');
const gekkoManager = cache.get('gekkos');

module.exports = function *() {
  let id = this.request.body.id;
  let spot = this.request.body.spot;
  let response = {};
  if (spot && id) {
    response = gekkoManager.saveSpot(id, spot);
  }
  this.body = response;
}
