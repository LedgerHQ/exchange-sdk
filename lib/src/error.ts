export class ExchangeError extends Error {
  cause: {
    swapCode: string;
    [key: string]: string | Error | undefined;
  };
  constructor(code = "swap000", nestedError?: Error) {
    super();
    this.name = "ExchangeError";
    // Support log for different error types.
    this.cause = {
      swapCode: code,
      ...(nestedError?.constructor !== Object ||
      nestedError?.constructor !== Array
        ? { message: `${nestedError}` }
        : {}),
      ...nestedError,
    };
  }
}

export class NonceStepError extends ExchangeError {
  constructor(nestedError?: Error) {
    super("swap001", nestedError);
    this.name = "NonceStepError";
  }
}

export class PayloadStepError extends ExchangeError {
  constructor(nestedError?: Error) {
    super("swap002", nestedError);
    this.name = "PayloadStepError";
  }
}

export class SignatureStepError extends ExchangeError {
  constructor(nestedError?: Error) {
    super("swap003", nestedError);
    this.name = "SignatureStepError";
  }
}

export class NotEnoughFunds extends ExchangeError {
  constructor() {
    super("swap004");
    this.name = "NotEnoughFunds";
  }
}

export class ListAccountError extends ExchangeError {
  constructor(nestedError?: Error) {
    super("swap005", nestedError);
    this.name = "ListAccountError";
  }
}

export class ListCurrencyError extends ExchangeError {
  constructor(nestedError?: Error) {
    super("swap006", nestedError);
    this.name = "ListCurrencyError";
  }
}

export class UnknownAccountError extends ExchangeError {
  constructor(nestedError?: Error) {
    super("swap007", nestedError);
    this.name = "UnknownAccountError";
  }
}

export class CancelStepError extends ExchangeError {
  constructor(nestedError?: Error) {
    super("swap008", nestedError);
    this.name = "CancelStepError";
  }
}

export class ConfirmStepError extends ExchangeError {
  constructor(nestedError?: Error) {
    super("swap009", nestedError);
    this.name = "ConfirmStepError";
  }
}

export class PayinExtraIdError extends ExchangeError {
  constructor(nestedError?: Error) {
    super("swap010", nestedError);
    this.name = "PayinExtraIdError";
  }
}
