export class ExchangeBaseError extends Error {
  cause: {
    exchangeErrorCode: string;
    [key: string]: string | Error | unknown | undefined;
  };
  message: string;
  constructor(exchangeErrorCode = "exchange000", nestedError?: Error) {
    super();
    this.name = "ExchangeError";
    // Support log for different error types.
    this.cause = {
      exchangeErrorCode,
      ...(nestedError?.constructor !== Object ||
      nestedError?.constructor !== Array
        ? { message: `${nestedError}` }
        : {}),
      ...nestedError,
    };
    this.message = nestedError?.message
      ? nestedError.message
      : `${nestedError}`;
  }
}

export class NonceStepError extends ExchangeBaseError {
  constructor(nestedError?: Error) {
    super("exchange001", nestedError);
    this.name = "NonceStepError";
  }
}

export class PayloadStepError extends ExchangeBaseError {
  constructor(nestedError?: Error) {
    super("exchange002", nestedError);
    this.name = "PayloadStepError";
  }
}

export class SignatureStepError extends ExchangeBaseError {
  constructor(nestedError?: Error) {
    super("exchange003", nestedError);
    this.name = "SignatureStepError";
  }
}
export class NotEnoughFunds extends ExchangeBaseError {
  constructor() {
    super("exchange004");
    this.name = "NotEnoughFunds";
  }
}

export class ListAccountError extends ExchangeBaseError {
  constructor(nestedError?: Error) {
    super("exchange005", nestedError);
    this.name = "ListAccountError";
  }
}

export class ListCurrencyError extends ExchangeBaseError {
  constructor(nestedError?: Error) {
    super("exchange006", nestedError);
    this.name = "ListCurrencyError";
  }
}

export class UnknownAccountError extends ExchangeBaseError {
  constructor(nestedError?: Error) {
    super("exchange007", nestedError);
    this.name = "UnknownAccountError";
  }
}

export class PayinExtraIdError extends ExchangeBaseError {
  constructor(nestedError?: Error) {
    super("exchange010", nestedError);
    this.name = "PayinExtraIdError";
  }
}

export class ProductTypeNotSupportedError extends ExchangeBaseError {
  constructor(nestedError?: Error) {
    super("exchange011", nestedError);
    this.name = "ProductTypeNotSupportedError";
  }
}

export type ExchangeSdkErrorType =
  | ExchangeBaseError
  | NonceStepError
  | PayloadStepError
  | SignatureStepError
  | NotEnoughFunds
  | ListAccountError
  | ListCurrencyError
  | UnknownAccountError
  | PayinExtraIdError
  | ProductTypeNotSupportedError;

export default {
  ExchangeBaseError,
  NonceStepError,
  PayloadStepError,
  SignatureStepError,
  NotEnoughFunds,
  ListAccountError,
  ListCurrencyError,
  UnknownAccountError,
  PayinExtraIdError,
  ProductTypeNotSupportedError,
};
