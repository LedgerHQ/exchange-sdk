import BigNumber from "bignumber.js";
import { confirmSwap, retrieveSwapPayload } from "../../src/api";
import { profiles } from "@ledgerhq/wallet-api-simulator";

describe("Api >> Swap", () => {
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

      await expect(retrieveSwapPayload(payload)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });

  describe("confirmSwap", () => {
    it("should reject when an invalid payload is passed", async () => {
      const payload = {
        provider: "ledger",
        swapId: "xxx",
        transactionId: "xxx",
      };

      await expect(confirmSwap(payload)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });
});
