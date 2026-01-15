import { cancelFund, confirmFund, retrieveFundPayload } from "../../src/api";
import { ProductType } from "../../src/sdk.types";

describe("Api >> Fund", () => {
  describe("retrieveFundPayload", () => {
    it("should reject when an invalid payload is passed", async () => {
      const payload = {
        quoteId: "example-quote-id",
        provider: "ledger",
        fromCurrency: "BTC",
        toCurrency: "USD",
        refundAddress: "0xabc123",
        amountFrom: 0.001,
        amountTo: 60,
        nonce: "nonce-xyz",
        type: ProductType.CARD,
      };

      await expect(retrieveFundPayload(payload)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });

  describe("confirmFund", () => {
    it("should reject when an invalid payload is passed", async () => {
      const payload = {
        provider: "xxx",
        quoteId: "xxx",
        transactionId: "xxx",
      };

      await expect(confirmFund(payload)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });

  describe("cancelFund", () => {
    it("should reject when an invalid payload is passed", async () => {
      const payload = {
        provider: "xxx",
        quoteId: "xxx",
      };

      await expect(cancelFund(payload)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });
});
