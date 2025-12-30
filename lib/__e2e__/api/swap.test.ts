import BigNumber from "bignumber.js";
import { profiles } from "@ledgerhq/wallet-api-simulator";
import { createBackendService } from "../../src/services/BackendService";

describe("Api >> Swap", () => {
  const backend = createBackendService("staging");

  describe("retrieveSwapPayload", () => {
    it("should reject when an invalid payload is passed", async () => {
      const payload = {
        quoteId: "example-quote-id",
        provider: "",
        deviceTransactionId: "xxx",
        fromAccount: profiles.STANDARD.accounts[0],
        toAccount: profiles.STANDARD.accounts[0],
        amount: new BigNumber(1),
        amountInAtomicUnit: new BigNumber(1),
      };

      await expect(backend.swap.retrievePayload(payload)).rejects.toMatchObject(
        {
          response: { status: 400 },
        },
      );
    });
  });

  describe("confirmSwap", () => {
    it("should reject when an invalid payload is passed", async () => {
      const payload = {
        provider: "ledger",
        swapId: "xxx",
        transactionId: "xxx",
      };

      await expect(backend.swap.confirm(payload)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });
});
