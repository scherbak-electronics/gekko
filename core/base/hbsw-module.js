/*
 * HBSW 
 * (how banking system works)
 *  
 * basic minimal module class which can save and load selected properties data to JSON file 
 * persistent storage. If file or directory not exist it creates new. Every write/read access to property 
 * will save/load value(s) to file. fs lib utilized for that and syncronus fs functions are used.    
 * 
 */
const _ = require('lodash');

class HbswModuleBase {
  constructor(config) {
    this.config = config;
  }

  getMarketPairId() {
    let pairid =
    config.exchange + '-' + 
    config.asset + '-' + 
    config.currency;
    return pairid; 
  }

  loadSettings() {}
  loadState() {}
  saveSettings() {}
  saveState() {}
}

module.exports = HbswModuleBase;
