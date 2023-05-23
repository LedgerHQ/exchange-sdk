const style = "background: #7f0000; color: #fff";
const prefix = "[ExchangeSDK]";

export class Logger {
  isActive = true;

  log(message: string, ...args: unknown[]) {
    if (this.isActive) {
      console.log(`%c${prefix} ${message}`, style, args);
    }
  }

  error(error: Error) {
    if (this.isActive) {
      console.error(`%c${prefix} ERROR`, style, "%O", error);
    }
  }

  debug(message: string, ...args: unknown[]) {
    if (this.isActive) {
      console.debug(`%c${prefix}D ${message}`, style, args);
    }
  }
}
