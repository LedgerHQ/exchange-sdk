import { WalletAPIClient } from "@ledgerhq/wallet-api-client";
import { ExchangeBaseError } from "./ExchangeSdkError";

/**
 * Display error on LL if LL did not do it. Then throw error back to the live app in case they need to react to it.
 * exchange008 (IgnoredSignatureStepError) is a special case where we don't want to display the error on LL
 * as they should handle it themselves.
 * Some errors are tagged as handled to know they're expected and user input related.
 */
export function handleErrors(walletAPI: WalletAPIClient<any>, error: unknown) {
  const exchangeError = error as {
    message?: string;
    cause?: {
      exchangeErrorCode?: string;
      name?: string;
    };
  };

  const ignoredErrorNames = new Set([
    "WrongDeviceForAccount",
    "WrongDeviceForAccountPayout",
    "WrongDeviceForAccountRefund",
  ]);

  const ignoredMessages = new Set(["User refused"]);

  if (
    ignoredMessages.has(exchangeError.message ?? "") ||
    (exchangeError.cause && ignoredErrorNames.has(exchangeError.cause.name ?? ""))
  ) {
    // Preserve the prototype chain — mutate rather than spread
    (error as Record<string, unknown>).handled = true;
    throw error;
  }

  if (
    error instanceof ExchangeBaseError &&
    exchangeError.cause?.exchangeErrorCode !== "exchange008"
  ) {
    walletAPI.custom.exchange.throwExchangeErrorToLedgerLive({ error });
  }

  throw error;
}
