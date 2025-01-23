import ExchangeSdkError from "./ExchangeSdkError";

export class DrawerClosedError extends ExchangeSdkError.ExchangeBaseError {
  handled: boolean;
  constructor(nestedError?: Error) {
    super("ll001", nestedError);
    this.name = "DrawerClosedError";
    this.handled = true;
  }
}
