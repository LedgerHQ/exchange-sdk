export class SwapError extends Error {
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
    };
    this.message = nestedError?.message
      ? nestedError.message
      : `${nestedError}`;
  }
}

export class NonceStepError extends SwapError {
  constructor(nestedError?: Error) {
    super("swap001", nestedError);
    this.name = "NonceStepError";
  }
}

export class PayloadStepError extends SwapError {
  constructor(nestedError?: Error) {
    super("swap002", nestedError);
    this.name = "PayloadStepError";
  }
}

export class SignatureStepError extends SwapError {
  constructor(nestedError?: Error) {
    super("swap003", nestedError);
    this.name = "SignatureStepError";
  }
}
export class IgnoredSignatureStepError extends SwapError {
  constructor(nestedError?: Error) {
    super("swap003Ignored", nestedError);
    this.name = "SignatureStepError";
  }
}

export class NotEnoughFunds extends SwapError {
  constructor() {
    super("swap004");
    this.name = "NotEnoughFunds";
  }
}

export class ListAccountError extends SwapError {
  constructor(nestedError?: Error) {
    super("swap005", nestedError);
    this.name = "ListAccountError";
  }
}

export class ListCurrencyError extends SwapError {
  constructor(nestedError?: Error) {
    super("swap006", nestedError);
    this.name = "ListCurrencyError";
  }
}

export class UnknownAccountError extends SwapError {
  constructor(nestedError?: Error) {
    super("swap007", nestedError);
    this.name = "UnknownAccountError";
  }
}

export class PayinExtraIdError extends SwapError {
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
