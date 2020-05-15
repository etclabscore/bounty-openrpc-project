import * as chalk from 'chalk';

const successString = chalk.bold.greenBright;
const errorString = chalk.bold.redBright;

const log = {
  success(message: string): void {
    console.log(successString(message));
  },
  error(message: string): void {
    console.log(errorString(message));
  },
};

export { log };
