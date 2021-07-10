/*

  SECO

  If you are interested in how SECO works, 
  read about Gekko first here:
  https://gekko.wizb.it/docs/internals/architecture.html

  Disclaimer:
  USE AT YOUR OWN RISK!
  The author of this project is NOT responsible for any damage or loss caused 
  by this software. There can be bugs and the bot may not perform as expected 
  or specified. Please consider testing it first with paper trading and/or 
  backtesting on historical data. Also look at the code to see what how 
  it is working.

*/

console.log(`

     %@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@(       
  .@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@     
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@    
 .@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@    
 .@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@    
 .@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@    
 .@@@@@@@@@@@@@@@@@@,     #@@@@@@@@@@@@@@@@@@    
 .@@@@@@@@@@@@@@@@           @@@@@@@@@@@@@@@@    
 .@@@@@@@@@@@@@@@/           @@@@@*  ,@@@@@@@    
 .@@@@@@@@@@@@@@@@           @@@@&   @@@@@@@@    
 .@@@@@@@@@@@@@@@@@@       @@@@@    #@@@@@@@@    
 .@@@@@@@@@@@@@@@@@@@@@@@@@@@&      @@@@@@@@@    
 .@@@@@@@@@@@@@@@@@@@.             @@@@@@@@@@    
 .@@@@@@@@@@@@@@                  @@@@@@@@@@@    
 .@@@@@@@@@@@@@                  @@@@@@@@@@@@    
  @@@@@@@@@@@&                  ,@@@@@@@@@@@@    
   @@@@@@@@@@,                  %@@@@@@@@@@@     
     .@@@@@@@                    @@@@@@@&        
                                                 
   @@@@@@   @@@@@@@@  /@@@@@@@(  *@@@@@@@@@      
  .@@@*     @@&////  &@@        %@@       @@     
      /@@@  @@&....  &@@        %@@       @@     
   @@&&@@@  @@@@@@@@  /@@@&&@@@  *@@@@&@@@@      
                                                 
                                                 
`);

const util = require(__dirname + '/core/util');

console.log('\tSECO v' + util.getVersion());
console.log('\t01. How Banking System Works - Funki Porcini', '\n\n');


const dirs = util.dirs();
//console.log('before launchUI');
if(util.launchUI()) {
  return require(util.dirs().web + 'server');
}
//console.log('after launchUI');
const pipeline = require(dirs.core + 'pipeline');
const config = util.getConfig();
const mode = util.gekkoMode();

if(
  config.trader &&
  config.trader.enabled &&
  !config['I understand that Gekko only MY OWN thoughts']
)
  util.die('Do you understand what Gekko will do with you? Read this first:\n\nhttps://github.com/askmike/gekko/issues/201');

// > Ever wonder why 500?
// > Cause heep, and sheep.
pipeline({
  config: config,
  mode: mode
});

