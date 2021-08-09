/*
 * SECO 
 * (how banking system works)
 *  
 * Base Module
 * Property Saver
 * basic minimal module class which can save and load selected properties data to JSON file 
 * persistent storage. If file or directory not exist it creates new. Every write/read access to property 
 * will save/load value(s) to file. fs lib utilized for that and syncronus fs functions are used.    
 * 
 */
const _ = require('lodash');
const fs = require('fs');
const util = require('../util.js');
const LogProxyClass = require('../log-proxy');
const dirs = util.dirs();

class BaseModule {
  constructor(config) {
    this.config = config;
    this.console = new LogProxyClass(this.config, 'Base');
    this.readBeforeWrite = false;
    this.pipelineDir = 'pipeline';
    this.exchangeDir = this.config.exchange;
    this.pairDir = this.config.asset + '-' + this.config.currency;
    this.pairPath = dirs.root + this.pipelineDir + '/' + this.exchangeDir + '/' + this.pairDir + '/';
    this.files = [];
  }

  isFileExist(file) {
    let res;
    try {
      fs.accessSync(file.path + file.name, fs.constants.R_OK | fs.constants.W_OK);
      res = true;
    } catch (err) {
      res = false;
    }
    return res;
  }

  isPathExist(file) {
    let res;
    try {
      fs.accessSync(file.path, fs.constants.R_OK | fs.constants.W_OK);
      res = true;
    } catch (err) {
      res = false;
    }
    return res;
  }

  createNewFile(file) {
    let pathCreated = false;
    if (!this.isPathExist()) {
      fs.mkdirSync(file.path, {recursive: true});
      pathCreated = true;
    }
    let data = {};
    let hasData = false;
    _.each(file.propNames, (filePropName) => {
      if (this[filePropName] !== undefined) {
        data[filePropName] = this[filePropName]; 
        hasData = true;
      }
    });
    if (hasData) {
      return this.writeFile(file, data);
    } else {
      if (pathCreated) {
        return true;
      }
    }
    return false;
  }

  createNewFilesIfNotExist() {
    let result = false;
    _.each(this.files, (file) => {
      if (!this.isFileExist(file)) {
        if (this.createNewFile(file)) {
          result = true;
        }
      } else {
        result = true;
      }
    });
    if (!result) {
      util.die('fatal error: cannot create or read JSON files');
    } else {
      return true;
    }
  }

  readFile(file) {
    let filePath = file.path + file.name;
    let result;
    try {
      result = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      result = {
        err: e
      };
    }
    if (!result.err) {
      return result;
    } 
    return false;
  }

  writeFile(file, data) {
    let fullPath = file.path + file.name;
    if (data) {
      try {
        fs.writeFileSync(fullPath, JSON.stringify(data, 0, 2));
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  /**
   * Writes value or values to JSON file(s) previously defined in this.files[] array
   * and set property propName of this object
   * if propName is undefined, value expects object with properties like value[propName]
   * also it sets all this[propName] defined in value array.
   * if value and propName params are both undefined it will write all defined this[propName] properties
   * to theirs respective files.
   * 
   * returns: 
   * true if atleast one property was written, 
   * false if nothing was written.
   * 
   * @param {String | undefined} propName 
   * @param {*} value 
   * @returns {Boolean} 
   */
  writeData(propName, value) {
    if (propName) {
      let file = this.getFileByPropName(propName);
      if (file) {
        let data = this.readFile(file);
        if (!data) {
          data = {};
        }
        if (value !== undefined) {
          this[propName] = value;
          data[propName] = value;
        } else {
          if (this[propName] !== undefined) {
            data[propName] = this[propName]; 
          }
        }
        if (!this.isFileExist(file)) {
          if (!this.createNewFile(file)) {
            return false;
          }
        }
        return this.writeFile(file, data);
      }
    } else {
      let result = false;
      if (value !== undefined) {
        _.each(this.files, (file) => {
          let data = this.readFile(file);  
          if (!data) {
            data = {};
          }
          let res = false;
          _.each(file.propNames, (filePropName) => {
            if (value[filePropName] !== undefined) {
              this[filePropName] = value[filePropName];
              data[filePropName] = value[filePropName];
              res = true;
            }
          });
          if (res) {
            if (!this.isFileExist(file)) {
              if (this.createNewFile(file)) {
                if (this.writeFile(file, data)) {
                  result = true;
                }
              }
            } else {
              if (this.writeFile(file, data)) {
                result = true;
              }
            }
          }
        });           
      } else {
        _.each(this.files, (file) => {
          let data = this.readFile(file);
          if (!data) {
            data = {};
          }
          let res = false;
          _.each(file.propNames, (filePropName) => {
            if (this[filePropName] !== undefined) {
              data[filePropName] = this[filePropName];
              res = true;
            }
          });
          if (res) {
            if (this.writeFile(file, data)) {
              result = true;
            }
          }
        });
      }
      return result;
    }
    return false;
  }

  /**
   * Reads property value from configured JSON file
   * and sets property propName of this object
   * @param {String} propName 
   * @returns {*}
   */
  readData(propName) {
    if (propName) {
      let file = this.getFileByPropName(propName); 
      if (file) {
        let data = this.readFile(file);
        if (data) {
          if (data[propName] !== undefined) {
            this[propName] = data[propName];
            return this[propName];
          }
        }
      }
      return undefined;
    } else {
      let allFilesData = {};
      let result = false;
      _.each(this.files, (file) => {
        let data = this.readFile(file);
        _.each(file.propNames, (filePropName) => {
          if (data[filePropName] !== undefined) {
            this[filePropName] = data[filePropName];
            allFilesData[filePropName] = data[filePropName];
            result = true;
          }
        });
      });
      if (result) {
        return allFilesData;
      }
    }
    return false;
  }

  getFileByPropName(propName) {
    let resFile;
    _.each(this.files, (file) => {
      let res = _.find(file.propNames, (filePropName) => {
        if (filePropName == propName) {
          return true;
        }
      });
      if (res) {
        resFile = file;
        return false;
      }
    });
    return resFile;
  }
}

module.exports = BaseModule;
