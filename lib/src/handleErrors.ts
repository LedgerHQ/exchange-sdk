import { WalletAPIClient } from "@ledgerhq/wallet-api-client";
import { ExchangeError } from "./error";

/**
 * Display error on LL if LL did not do it. Then throw error back to the live app in case they need to react to it
 * swap003 is a special case where we don't want to display the error on LL as they should handle it themselves
 * Some errors are tagged as handled to know they're expected and user input related
 * @param walletAPI
 * @param error
 */
export function handleErrors(walletAPI: WalletAPIClient<any>, error: any) {
  const { message, cause } = error as {
    message: string;
    cause: {
      swapCode: string;
      name: string;
      message: string;
    };
  };

  const ignoredErrorNames = new Set([
    "WrongDeviceForAccount",
    "WrongDeviceForAccountPayout",
    "WrongDeviceForAccountRefund",
  ]);

  const ignoredMessages = new Set(["User refused"]);

  if (ignoredMessages.has(message) || ignoredErrorNames.has(cause.name)) {
    throw { ...error, handled: true }; // retry ready
  }

  // Log and throw to Ledger Live if not ignored
  if (error instanceof ExchangeError && cause && cause.swapCode !== "swap003Ignored") {
    walletAPI.custom.exchange.throwExchangeErrorToLedgerLive({ error });
  }

  throw error;
}
