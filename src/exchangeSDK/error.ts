export class ExchangeError extends Error {
  readonly nestedError: Error | undefined;
  constructor(nestedError?: Error, message?: string) {
    super(message);
    this.name = "ExchangeError";
    this.nestedError = nestedError;
  }
}

export class NonceStepError extends ExchangeError {
  constructor(nestedError?: Error, message?: string) {
    super(nestedError, message);
    this.name = "NonceStepError";
  }
}

export class PayloadStepError extends ExchangeError {
  constructor(nestedError?: Error, message?: string) {
    super(nestedError, message);
    this.name = "PayloadStepError";
  }
}

export class SignatureStepError extends ExchangeError {
  constructor(nestedError?: Error, message?: string) {
    super(nestedError, message);
    this.name = "SignatureStepError";
  }
}
