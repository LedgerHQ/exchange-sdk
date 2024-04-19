import { WalletAPIClient } from "@ledgerhq/wallet-api-client";
import { ExchangeError } from "./error";

/**
 * Display error on LL if LL did not do it. Then throw error back to the live app in case they need to react to it
 * @param walletAPI 
 * @param error 
 */
export function handleErrors(walletAPI: WalletAPIClient<any>, error: any) {
  const { message, cause } = error as { message: string; cause: { name: string; message: string; } };

  const ignoredErrorNames = new Set([
      "WrongDeviceForAccount",
      "WrongDeviceForAccountPayout",
      "WrongDeviceForAccountRefund",
      "CancelStepError",
      "SwapCompleteExchangeError",
  ]);

  const ignoredMessages = new Set([
      "User refused"
  ]);

  if (ignoredMessages.has(message) || ignoredErrorNames.has(cause.name)) {
      throw error;
  }

  // Log and throw to Ledger Live if not ignored
  if (error instanceof ExchangeError && cause) {
      walletAPI.custom.exchange.throwExchangeErrorToLedgerLive({error});
  } 
  throw error;
}
