var colors = require('colors');
const moment = require('moment');

class LogProxy {
  constructor(config, moduleName) {
    this.config = config;
    this.moduleName = moduleName;
  }
  log(str, ...args) {
    if(typeof(console) !== 'undefined') {
      let day = moment().format('DD ');
      let time = moment().format('HH:mm:ss');
      let info = ' (' + this.config.asset + ') ' + this.moduleName + ': ';
      let prepend = day.bold.blue + time.blue + info.grey;
      str = prepend + str;
      console.log(str, ...args);
    }
  }
}

module.exports = LogProxy;