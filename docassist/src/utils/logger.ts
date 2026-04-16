import chalk from 'chalk';

export const logger = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✔'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), chalk.yellow(msg)),
  error: (msg: string, err?: any) => {
    console.error(chalk.red('✖'), chalk.red(msg));
    if (err) console.error(chalk.red(err.stack || err.message || err));
  },
  debug: (msg: string) => {
    if (process.env.DOCASSIST_DEBUG || global.verboseMode) {
      console.log(chalk.gray('  [DEBUG] ' + msg));
    }
  },
  table: (data: any[]) => console.table(data)
};

declare global {
  var verboseMode: boolean;
}
