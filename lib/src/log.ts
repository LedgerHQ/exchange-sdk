import { SwapError } from "./error/SwapError";
import { ExchangeBaseError } from "./error/ExchangeSdkError";

const style = "background: #7f0000; color: #fff";
const prefix = "[ExchangeSDK]";

export class Logger {
  private isActive: boolean;

  constructor(isActive?: boolean) {
    this.isActive = isActive ?? true;
  }

  log(message: string, ...args: unknown[]) {
    if (this.isActive) {
      console.log(`%c${prefix} ${message}`, style, args);
    }
  }

  error(error: SwapError | ExchangeBaseError | Error) {
    if (this.isActive) {
      const errorParams = [
        `%c${prefix} ERROR`,
        style,
        "%O",
        error,
        "cause" in error ? error.cause : undefined,
      ].filter((x) => x !== undefined);
      console.error(...errorParams);
    }
  }

  debug(message: string, ...args: unknown[]) {
    if (this.isActive) {
      console.debug(`%c${prefix}D ${message}`, style, args);
    }
  }
}
