import { IgnoredSignatureStepError, ListAccountError, ListCurrencyError, NonceStepError, NotEnoughFunds, PayinExtraIdError, PayloadStepError, SignatureStepError, UnknownAccountError } from './SwapError';
import ExchangeSdkError, { ExchangeSdkErrorType } from "./ExchangeSdkError"
import { DrawerClosedError } from "./LedgerLiveError"
import { FlowType } from '../sdk';

export enum StepError {
  NONCE = 'NonceStepError',
  PAYLOAD = 'PayloadStepError',
  SIGNATURE = 'SignatureStepError',
  IGNORED_SIGNATURE = 'IgnoredSignatureStepError',
  CHECK_FUNDS = 'CheckFundsStepError',
  LIST_ACCOUNT = 'ListAccountStepError',
  LIST_CURRENCY = 'ListCurrencyStepError',
  UNKNOWN_ACCOUNT = 'UnknownAccountStepError',
  PAYIN_EXTRA_ID = 'PayinExtraIdStepError',
  AMOUNT_MISMATCH = 'AmountMismatch'
}

export const parseError = (flowType: FlowType, err: Error, step?: StepError) => {
  if (err instanceof Error && err.name === "DrawerClosedError") {
    return new DrawerClosedError(err)
  }

  switch (flowType) {
    case 'generic':
      const genericError = step && GenericErrors[step]
      return genericError ? new genericError(err) : err
    case 'swap':
      return step ? new SwapErrors[step](err) : err;
  }
}
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
  [StepError.AMOUNT_MISMATCH]: ExchangeSdkError.AmountMismatchError
}

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
  [StepError.AMOUNT_MISMATCH]: ExchangeSdkError.AmountMismatchError
}