const SecoModule = require('./base-module');

class HbswModule extends SecoModule {
  constructor(config) {
    super(config);
    this.files = [
      {
        path: this.pairPath,
        name: 'state.json',
        createIfNotExist: true,
        propNames: [
          'sellOnlyMode',
          'buyOnlyIfGoesDown',
          'tradingEnabled',
          'ordersEnabled'
        ]
      },
      {
        path: this.pairPath,
        name: 'orders.json',
        createIfNotExist: true,
        propNames: [
          'orders'
        ]
      }
    ];
    this.sellOnlyMode = false;
    this.buyOnlyIfGoesDown = false;
    this.tradingEnabled = true;
    this.ordersEnabled = false;
    this.orders = [];
    this.load();
  }

  showProps() {
    this.console.log('sellOnlyMode = %s', this.sellOnlyMode);
    this.console.log('buyOnlyIfGoesDown = %s', this.buyOnlyIfGoesDown);
    this.console.log('tradingEnabled = %s', this.tradingEnabled);
    this.console.log('ordersEnabled = %s', this.ordersEnabled);
    this.console.log('orders = %s', this.orders);
  }

  getAndShowProps() {
    this.console.log('sellOnlyMode = %s', this.getSellOnlyMode());
    this.console.log('buyOnlyIfGoesDown = %s', this.getBuyOnlyIfGoesDown());
    this.console.log('tradingEnabled = %s', this.getTradingEnabled());
    this.console.log('ordersEnabled = %s', this.getOrdersEnabled());
    this.console.log('orders = %s', this.getOrders());
  }

  setSellOnlyMode(value) {
    this.setData('sellOnlyMode', value);
  }
  setBuyOnlyIfGoesDown(value) {
    this.setData('buyOnlyIfGoesDown', value);
  }
  setTradingEnabled(value) {
    this.setData('tradingEnabled', value);
  }
  setOrdersEnabled(value) {
    this.setData('ordersEnabled', value);
  }
  setOrders(value) {
    this.setData('orders', value);
  }

  getSellOnlyMode() {
    return this.getData('sellOnlyMode');
  }
  getBuyOnlyIfGoesDown() {
    return this.getData('buyOnlyIfGoesDown');
  }
  getTradingEnabled() {
    return this.getData('tradingEnabled');
  }
  getOrdersEnabled() {
    return this.getData('ordersEnabled');
  }
  getOrders() {
    return this.getData('orders');
  }
}

module.exports = HbswModule;