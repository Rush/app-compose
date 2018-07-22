const chalk = require('chalk');

const str = chalk(chalk.blue.bgRed.bold('Hello world 2!') + chalk.red('Hello', chalk.underline.bgBlue('world') + '!'), 'A');

setInterval(() => {
  console.log(str);
}, 500 + Math.random() * 500);


process.on('SIGINT', () => {
  console.log('GOT SIGINT inside');
  setTimeout(() => { process.exit(0) }, 5000);
});


