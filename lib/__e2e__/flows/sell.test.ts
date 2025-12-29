import BigNumber from "bignumber.js";
import { ExchangeSDK } from "../../src";
import {
  getSimulatorTransport,
  profiles,
} from "@ledgerhq/wallet-api-simulator";
import { SimulatorProfile } from "@ledgerhq/wallet-api-simulator/lib/types";

describe("ExchangeSDK.sell", () => {
  let sdk: ExchangeSDK;

  beforeEach(() => {
    jest.clearAllMocks();

    const transport = getSimulatorTransport(
      MOCK_SELL_PROFILE,
      mockSellExchangeHandlers,
    );

    sdk = new ExchangeSDK("transak", {
      transport,
      customUrl: "https://exchange-tx-manager-e2e.aws.stg.ldg-tech.com",
    });
  });

  it("should return a transaction", async () => {
    const result = await sdk.sell({
      fromAccountId: "account-btc-1",
      fromAmount: new BigNumber(0.00000001),
      quoteId: "88c80c6b-c8a8-4af5-b594-e4454323d06c",
      toFiat: "EUR",
      rate: 1,
    });

    expect(result).toBe("MOCK_TRANSACTION_HASH");
  });
});

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

const mockSellExchangeHandlers = {
  // 1.  `exchangeModule.startSell`
  "custom.exchange.start": async (params: any) => {
    return { transactionId: "b3f1df21-9016-4bba-b0ea-46b1a9b1b84c" };
  },

  // 2. `exchangeModule.completeSell`
  "custom.exchange.complete": async (params: any) => {
    return { transactionHash: "MOCK_TRANSACTION_HASH" };
  },
};
