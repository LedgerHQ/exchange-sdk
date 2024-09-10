export class ExchangeError extends Error {
  cause: {
    swapCode: string;
    [key: string]: string | Error | unknown | undefined;
  };
  message: string;
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
      ...((nestedError as any)?.response && {
        statusCode: (nestedError as any).response.status,
      }),
    };
    this.message = nestedError?.message
      ? nestedError.message
      : `${nestedError}`;
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

export type CompleteExchangeStep =
  | "INIT"
  | "SET_PARTNER_KEY"
  | "CHECK_PARTNER"
  | "PROCESS_TRANSACTION"
  | "CHECK_TRANSACTION_SIGNATURE"
  | "CHECK_PAYOUT_ADDRESS"
  | "CHECK_REFUND_ADDRESS"
  | "SIGN_COIN_TRANSACTION";

export class CompleteExchangeError extends Error {
  step: CompleteExchangeStep;

  constructor(step: CompleteExchangeStep, message?: string) {
    super(message);
    this.name = "CompleteExchangeError";
    this.step = step;
  }
}
