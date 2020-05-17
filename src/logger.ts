import * as chalk from 'chalk';

const infoString = chalk.bold.blueBright;
const successString = chalk.bold.greenBright;
const warnString = chalk.bold.yellow;
const errorString = chalk.bold.redBright;

const log = {
  success(message: string): void {
    console.log(successString(message));
  },
  warn(message: string): void {
    console.log(warnString(message));
  },
  error(message: string): void {
    console.log(errorString(message));
  },
};

const styledString = {
  info(text: string): string {
    return infoString(text);
  },
  warning(text: string): string {
    return warnString(text);
  },
};

export { log, styledString };
