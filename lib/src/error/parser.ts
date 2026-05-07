import ExchangeSdkError, { ExchangeSdkErrorType } from "./ExchangeSdkError";
import { DrawerClosedError } from "./LedgerLiveError";

export enum StepError {
  NONCE = "NonceStepError",
  PAYLOAD = "PayloadStepError",
  SIGNATURE = "SignatureStepError",
  IGNORED_SIGNATURE = "IgnoredSignatureStepError",
  CHECK_FUNDS = "CheckFundsStepError",
  LIST_ACCOUNT = "ListAccountStepError",
  LIST_CURRENCY = "ListCurrencyStepError",
  UNKNOWN_ACCOUNT = "UnknownAccountStepError",
  PAYIN_EXTRA_ID = "PayinExtraIdStepError",
  PRODUCT_SUPPORT = "ProductTypeNotSupportedStepError",
  REQUEST_ACCOUNT = "RequestAccount",
  SIGN = "Sign",
  UNSUPPORTED_TOKEN = "UnsupportedTokenTypeStepError",
}

export type ParseError = {
  error: Error;
  step?: StepError;
};

type ErrorConstructor = (new (err?: Error) => ExchangeSdkErrorType) | undefined;

const ErrorMap: Record<StepError, ErrorConstructor> = {
  [StepError.NONCE]: ExchangeSdkError.NonceStepError,
  [StepError.PAYLOAD]: ExchangeSdkError.PayloadStepError,
  [StepError.SIGNATURE]: ExchangeSdkError.SignatureStepError,
  [StepError.IGNORED_SIGNATURE]: ExchangeSdkError.IgnoredSignatureStepError,
  [StepError.CHECK_FUNDS]: ExchangeSdkError.NotEnoughFunds,
  [StepError.LIST_ACCOUNT]: ExchangeSdkError.ListAccountError,
  [StepError.LIST_CURRENCY]: ExchangeSdkError.ListCurrencyError,
  [StepError.REQUEST_ACCOUNT]: ExchangeSdkError.RequestAccountError,
  [StepError.UNKNOWN_ACCOUNT]: ExchangeSdkError.UnknownAccountError,
  [StepError.PAYIN_EXTRA_ID]: ExchangeSdkError.PayinExtraIdError,
  [StepError.PRODUCT_SUPPORT]: ExchangeSdkError.ProductTypeNotSupportedError,
  [StepError.SIGN]: ExchangeSdkError.SignError,
  [StepError.UNSUPPORTED_TOKEN]:
    ExchangeSdkError.UnsupportedTokenTypeNotSupportedError,
};

export const parseError = ({ error, step }: ParseError) => {
  if (error instanceof Error && error.name === "DrawerClosedError") {
    return new DrawerClosedError(error);
  }

  const Ctor = step && ErrorMap[step];
  return Ctor ? new Ctor(error) : error;
};
