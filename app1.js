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


console.log('ENV', process.env);

process.on('SIGINT', () => {
  console.log('GOT SIGINT inside');
  setTimeout(() => { process.exit(0) }, 500);
});

setTimeout(() => {
  console.log('EXIT!!');
  process.exit();
}, 20000);


const http = require('http');

http.createServer((req, res) => {
  res.write('hello');
  res.end();
}).listen(8090);

// ["SIGUSR1", "SIGINT", "SIGTERM", "SIGPIPE", "SIGHUP", "SIGBREAK", "SIGWINCH",].map(function(sigName){
//   process.on(sigName, function(){
//       console.log("Received " + sigName);
//   });
// });



