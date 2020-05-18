import * as chalk from 'chalk';

const infoString = chalk.bold.blueBright;
const successString = chalk.bold.greenBright;
const warnString = chalk.bold.yellow;
const errorString = chalk.bold.redBright;

const log = {
  success(message: string): void {
    console.log(successString(message));
  },
  info(message: string): void {
    console.log(infoString(message));
  },
  warn(message: string): void {
    console.log(warnString(message));
  },
  error(message: string): void {
    console.error(errorString(message));
    process.exit(1);
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
