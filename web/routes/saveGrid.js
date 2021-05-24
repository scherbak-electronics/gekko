const _ = require('lodash');
const cache = require('../state/cache');
const gekkoManager = cache.get('gekkos');

module.exports = function *() {
  let id = this.request.body.id;
  let grid = this.request.body.grid;
  let response = {};
  if (grid && id) {
    response = gekkoManager.saveGrid(id, grid);
  }
  this.body = response;
}
