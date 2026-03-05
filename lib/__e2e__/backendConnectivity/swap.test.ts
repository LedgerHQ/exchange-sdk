import { createBackendService } from "../../src/services/BackendService";

describe("Api >> Swap", () => {
  const backend = createBackendService("staging");

  describe("retrieveSwapPayload", () => {
    it("should reject when an invalid payload is passed", async () => {
      const payload = {
        provider: "",
        deviceTransactionId: "xxx",
        from: "bitcoin",
        to: "ethereum",
        address: "0xinvalid",
        refundAddress: "0xinvalid",
        amountFrom: "1",
        amountFromInSmallestDenomination: 1,
        rateId: "example-quote-id",
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
