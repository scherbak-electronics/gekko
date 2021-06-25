const _ = require('lodash');
const cache = require('../state/cache');
const gekkoManager = cache.get('gekkos');

module.exports = function *() {
  let pipelineId = this.request.body.pipelineId;
  let pipelineAction = this.request.body.pipelineAction;
  this.request.body.pipelineActionReturn = gekkoManager.executePipelineAction(pipelineId, pipelineAction);
}
