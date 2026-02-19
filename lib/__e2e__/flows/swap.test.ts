import BigNumber from "bignumber.js";
import { ExchangeSDK } from "../../src";
import { profiles } from "@ledgerhq/wallet-api-simulator";
import { SimulatorProfile } from "@ledgerhq/wallet-api-simulator/lib/types";
import {
  resetWireMockRequests,
  findRequestPayloads,
} from "../utils/wiremockHelpers";
import { createMockedSdk } from "../utils/createMockedSdk";

describe("ExchangeSDK.swap", () => {
  let sdk: ExchangeSDK;

  beforeEach(async () => {
    sdk = createMockedSdk();

    jest.clearAllMocks();

    await resetWireMockRequests();
  });

  it("should return a transactionId and swapId", async () => {
    const result = await sdk.swap({
      fromAccountId: "account-btc-1",
      toAccountId: "account-eth-1",
      fromAmount: new BigNumber(0.00000001),
      quoteId: "88c80c6b-c8a8-4af5-b594-e4454323d06c",
      feeStrategy: "medium",
      rate: 1,
    });

    expect(result).toStrictEqual({
      swapId: "mock-swap-id-001",
      transactionId: "MOCK_TRANSACTION_HASH",
    });

    /**
     * Verify the requests sent to the backend
     */
    const remitPayloads = await findRequestPayloads("POST", "/v5/swap");

    expect(remitPayloads).toHaveLength(1);
    expect(remitPayloads[0]).toStrictEqual({
      provider: "transak",
      deviceTransactionId: "b3f1df21-9016-4bba-b0ea-46b1a9b1b84c",
      from: "bitcoin",
      to: "ethereum",
      address: "11111a11-1aaa-111a-1aa1-aa11aa11aa11",
      refundAddress: "11111a11-1aaa-111a-1aa1-aa11aa11aa11",
      amountFrom: "1e-8",
      amountFromInSmallestDenomination: 1,
      rateId: "88c80c6b-c8a8-4af5-b594-e4454323d06c",
    });

    const confirmPayloads = await findRequestPayloads(
      "POST",
      "/v5/swap/accepted",
    );

    expect(confirmPayloads).toHaveLength(1);
    expect(confirmPayloads[0]).toStrictEqual({
      provider: "transak",
      hardwareWalletType: "",
      sourceCurrencyId: "bitcoin",
      swapId: "mock-swap-id-001",
      targetCurrencyId: "ethereum",
      transactionId: "MOCK_TRANSACTION_HASH",
    });
  });
});
