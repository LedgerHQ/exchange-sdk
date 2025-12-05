import BigNumber from "bignumber.js";
import { ExchangeSDK } from "../../src";
import {
  getSimulatorTransport,
  profiles,
} from "@ledgerhq/wallet-api-simulator";
import { SimulatorProfile } from "@ledgerhq/wallet-api-simulator/lib/types";

const TEST_PROFILE: SimulatorProfile = {
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

const mockExchangeHandlers = {
  // 1. Mock Handler for custom.exchange.start (for SWAP and FUND)
  "custom.exchange.start": async (params: any) => {
    // Check if the parameters match what the Exchange SDK sends
    // The fund flow typically starts with a "FUND" exchangeType
    if (params.exchangeType === "FUND") {
      console.log("SIMULATOR: Received FUND start request.");
      // MUST return the expected type: { transactionId: string }
      return { transactionId: "b3f1df21-9016-4bba-b0ea-46b1a9b1b84c" };
    }
    // Handle other types if necessary
    return { transactionId: "b3f1df21-9016-4bba-b0ea-46b1a9b1b84c" };
  },

  // 2. Mock Handler for custom.exchange.complete (required to finalize the flow)
  "custom.exchange.complete": async (params: any) => {
    console.log("SIMULATOR: Received exchange complete request.");
    // MUST return the expected type: { signature: string }
    return { signature: "mock_signed_data_0xABC" };
  },

  // Add any other core Wallet API handlers your flow implicitly uses (e.g., account.list)
  // or define them as part of the simulator constructor's default arguments.
};

describe("ExchangeSDK.fund", () => {
  let sdk: ExchangeSDK;

  beforeEach(() => {
    jest.clearAllMocks();

    const transport = getSimulatorTransport(TEST_PROFILE, mockExchangeHandlers);

    sdk = new ExchangeSDK("provider-id", { transport });
  });

  /**
   * const {
         fromAccountId,
         fromAmount,
         feeStrategy = FeeStrategyEnum.MEDIUM,
         customFeeConfig = {},
         quoteId,
         type = ProductType.CARD,
         toAmount,
         toCurrency,
       } = info;
   */

  it("should fund", async () => {
    // startFund -> custom.exchange.start -> no request handler found for methodId
    const result = await sdk.sell({
      fromAccountId: "account-btc-1",
      fromAmount: new BigNumber(0.00000001),
      quoteId: "88c80c6b-c8a8-4af5-b594-e4454323d06c",
    });

    // {
    //   quoteId?: string;
    //   fromAccountId: string;
    //   fromAmount: BigNumber;
    //   toFiat?: string;
    //   feeStrategy?: FeeStrategy;
    //   ledgerSessionId?: string;
    //   rate?: number;
    //   customFeeConfig?: { [key: string]: BigNumber };
    //   getSellPayload?: GetSellPayload;
    //   type?: ProductType;
    // }
  });
});
