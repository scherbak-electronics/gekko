// base order
const moment = require('moment');
class BaseOrder {
  id;
  sellOrderId;
  buyOrderId;
  side;
  amountAsset;
  amountCurrency;
  amountFilled;
  status;
  type;
  price;
  time;
  updateTime;
  readableTime;
  readableUpdateTime;
  isManuallyCreated;
  isEnabled;
  averagingStepNumber;
  priceStepDownPcnt;
  nextStepDownPrice;
  set time(time) {
    this.time = time;
    this.readableTime = moment(time).format('YYYY-MM-DD HH:mm:ss');
    this.updateTime = time;
  }

  set updateTime(time) {
    this.updateTime = time;
    this.readableUpdateTime = moment(time).format('YYYY-MM-DD HH:mm:ss');
  }
}

module.exports = BaseOrder;