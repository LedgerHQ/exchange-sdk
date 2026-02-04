import BigNumber from "bignumber.js";
import { ExchangeSDK } from "../../src";
import { profiles } from "@ledgerhq/wallet-api-simulator";
import { SimulatorProfile } from "@ledgerhq/wallet-api-simulator/lib/types";
import {
  resetWireMockRequests,
  findRequestPayloads,
} from "../utils/wiremockHelpers";
import { createMockedSdk } from "../utils/createMockedSdk";

describe("ExchangeSDK.sell", () => {
  let sdk: ExchangeSDK;

  beforeEach(async () => {
    sdk = createMockedSdk();

    jest.clearAllMocks();

    await resetWireMockRequests();
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

    /**
     * Verify the requests sent to the backend
     */

    const remitPayloads = await findRequestPayloads(
      "POST",
      "/exchange/v1/sell/onramp_offramp/remit",
    );

    expect(remitPayloads).toHaveLength(1);
    expect(remitPayloads[0]).toStrictEqual({
      quoteId: "88c80c6b-c8a8-4af5-b594-e4454323d06c",
      provider: "transak",
      fromCurrency: "bitcoin",
      toCurrency: "EUR",
      refundAddress: "11111a11-1aaa-111a-1aa1-aa11aa11aa11",
      amountFrom: 0.00000001,
      amountTo: 0.00000001,
      nonce: "b3f1df21-9016-4bba-b0ea-46b1a9b1b84c",
    });

    const confirmPayloads = await findRequestPayloads(
      "POST",
      "/history/webhook/v1/transaction/mock-generic-sell-id-001/accepted",
    );

    expect(confirmPayloads).toHaveLength(1);
    expect(confirmPayloads[0]).toStrictEqual({
      provider: "transak",
      transactionId: "MOCK_TRANSACTION_HASH",
    });
  });
});
