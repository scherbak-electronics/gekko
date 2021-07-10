var colors = require('colors');
console.log('hello +%s% SECO!'.green, 2345); 
var priceDiffPcnt = 2.5;
console.log('Logic: price change '.bold + 'up %s%'.green, priceDiffPcnt);

priceDiffPcnt = -3.5;
console.log('Logic: price change '.bold + 'down %s%'.red, priceDiffPcnt);

var obj = {prop: undefined};
console.log(!obj.prop);
console.log(!obj.aaa);