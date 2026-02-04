import { ExchangeSDK } from "../../src";
import {
  getSimulatorTransport,
  profiles,
} from "@ledgerhq/wallet-api-simulator";
import { SimulatorProfile } from "@ledgerhq/wallet-api-simulator/lib/types";
import { WIREMOCK_BASE_URL } from "../config";

export function createMockedSdk() {
  const transport = getSimulatorTransport(
    MOCK_SELL_PROFILE,
    MOCK_SELL_EXCHANGE_HANDLERS,
  );

  return new ExchangeSDK("transak", {
    transport,
    customUrl: WIREMOCK_BASE_URL,
  });
}

const MOCK_SELL_PROFILE: SimulatorProfile = {
  ...profiles.STANDARD,
  permissions: {
    ...profiles.STANDARD.permissions,
    methodIds: [
      "account.list",
      "account.request",
      "currency.list",
      "custom.exchange.error",
      "custom.exchange.start",
      "custom.exchange.complete",
      "custom.close",
      "wallet.info",
    ],
  },
};

const MOCK_SELL_EXCHANGE_HANDLERS = {
  // 1.  `exchangeModule.startSell`
  "custom.exchange.start": async (params: any) => {
    return { transactionId: "b3f1df21-9016-4bba-b0ea-46b1a9b1b84c" };
  },

  // 2. `exchangeModule.completeSell`
  "custom.exchange.complete": async (params: any) => {
    return { transactionHash: "MOCK_TRANSACTION_HASH" };
  },
};
