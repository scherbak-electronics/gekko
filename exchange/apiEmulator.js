const ApiEmulator = function(api) {
  this.api = api;
  console.log('[API Emulator] set real API object');
  this.orders = [];
};

ApiEmulator.prototype.addOrder = function(order) {
  console.log('[API Emulator] simulate order creation');
  this.orders.push(order);
}

module.exports = ApiEmulator;