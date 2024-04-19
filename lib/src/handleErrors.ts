import { WalletAPIClient } from "@ledgerhq/wallet-api-client";
import { ExchangeError } from "./error";

export function handleErrors(walletAPI: WalletAPIClient<any>, error: any) {
    walletAPI.custom.exchange.throwExchangeErrorToLedgerLive({error});

    // Continue with the existing logic...
    const { name, cause } = (error as any) || {};
    const { message } = cause || {};
    if (
      message !== "User refused" &&
      name !== "DisabledTransactionBroadcastError"
    ) {
      if (error instanceof ExchangeError) {
        const errorName =
          "name" in error.cause && (error.cause.name as string);

        switch (errorName) {
          case "WrongDeviceForAccount":
          case "WrongDeviceForAccountPayout":
          case "WrongDeviceForAccountRefund":
          case "CancelStepError":
          case "SwapCompleteExchangeError":
            break;
          default:
            walletAPI.custom.exchange.throwExchangeErrorToLedgerLive({error});
            break;
        }
      } else if (error instanceof Error) {
        walletAPI.custom.exchange.throwExchangeErrorToLedgerLive({error: undefined});
      }
      throw error;
    }
}
