// base order

class BaseOrder {
  id;
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

  set time(time) {
    this.time = time;
    this.updateTime = time;
  }

  set readableTime(time) {
    this.readableTime = time;
    this.readableUpdateTime = time;
  }
}

module.exports = BaseOrder;