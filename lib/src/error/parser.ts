import {
  IgnoredSignatureStepError,
  ListAccountError,
  ListCurrencyError,
  NonceStepError,
  NotEnoughFunds,
  PayinExtraIdError,
  PayloadStepError,
  ProductTypeNotSupportedError,
  UnsupportedTokenTypeNotSupportedError,
  SignatureStepError,
  UnknownAccountError,
} from "./SwapError";
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
  UNSUPPORTED_TOKEN = "UnsupportedTokenTypeStepError",
}

export enum CustomErrorType {
  SWAP = "swap",
}

export type ParseError = {
  error: Error;
  step?: StepError;
  customErrorType?: CustomErrorType;
};

export const parseError = ({ error, step, customErrorType }: ParseError) => {
  if (error instanceof Error && error.name === "DrawerClosedError") {
    return new DrawerClosedError(error);
  }

  switch (customErrorType) {
    case "swap":
      return step ? new SwapErrors[step](error) : error;
    default:
      const genericError = step && GenericErrors[step];
      return genericError ? new genericError(error) : error;
  }
};
type ErrorConstructor = (new (err?: Error) => ExchangeSdkErrorType) | undefined;

const GenericErrors: Record<StepError, ErrorConstructor> = {
  [StepError.NONCE]: ExchangeSdkError.NonceStepError,
  [StepError.PAYLOAD]: ExchangeSdkError.PayloadStepError,
  [StepError.SIGNATURE]: ExchangeSdkError.SignatureStepError,
  [StepError.CHECK_FUNDS]: ExchangeSdkError.NotEnoughFunds,
  [StepError.IGNORED_SIGNATURE]: undefined,
  [StepError.LIST_ACCOUNT]: ExchangeSdkError.ListAccountError,
  [StepError.LIST_CURRENCY]: ExchangeSdkError.ListCurrencyError,
  [StepError.UNKNOWN_ACCOUNT]: ExchangeSdkError.UnknownAccountError,
  [StepError.PAYIN_EXTRA_ID]: ExchangeSdkError.PayinExtraIdError,
  [StepError.PRODUCT_SUPPORT]: ExchangeSdkError.ProductTypeNotSupportedError,
  [StepError.UNSUPPORTED_TOKEN]: ExchangeSdkError.UnsupportedTokenTypeNotSupportedError,
};

const SwapErrors: Record<StepError, new (err?: Error) => Error | undefined> = {
  [StepError.NONCE]: NonceStepError,
  [StepError.PAYLOAD]: PayloadStepError,
  [StepError.SIGNATURE]: SignatureStepError,
  [StepError.CHECK_FUNDS]: NotEnoughFunds,
  [StepError.IGNORED_SIGNATURE]: IgnoredSignatureStepError,
  [StepError.LIST_ACCOUNT]: ListAccountError,
  [StepError.LIST_CURRENCY]: ListCurrencyError,
  [StepError.UNKNOWN_ACCOUNT]: UnknownAccountError,
  [StepError.PAYIN_EXTRA_ID]: PayinExtraIdError,
  [StepError.PRODUCT_SUPPORT]: ProductTypeNotSupportedError,
  [StepError.UNSUPPORTED_TOKEN]: UnsupportedTokenTypeNotSupportedError,
};
