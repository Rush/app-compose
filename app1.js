const chalk = require('chalk');

console.log('a');
console.log('');
console.log('b');

const str = chalk(chalk.blue.bgRed.bold('Hello world 1!') + chalk.red('Hel\nlo', chalk.underline.bgBlue('world') + '!'), 'A');

setInterval(() => {
  console.log(str);

  console.log('c');
  console.log('');
  console.log('d');
}, 500 + Math.random() * 500);


process.on('SIGINT', () => {
  console.log('GOT SIGINT inside');
  setTimeout(() => { process.exit(0) }, 5000);
});

setTimeout(() => {
  console.log('EXIT!!');
  process.exit();
}, 20000);

// ["SIGUSR1", "SIGINT", "SIGTERM", "SIGPIPE", "SIGHUP", "SIGBREAK", "SIGWINCH",].map(function(sigName){
//   process.on(sigName, function(){
//       console.log("Received " + sigName);
//   });
// });



