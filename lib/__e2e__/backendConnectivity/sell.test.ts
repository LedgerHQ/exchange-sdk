import { createBackendService } from "../../src/services/BackendService";
import { ProductType } from "../../src/sdk.types";

describe("Api >> Sell", () => {
  const backend = createBackendService("staging");

  describe("retrieveSellPayload", () => {
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
        type: ProductType.SELL,
      };

      await expect(backend.sell.retrievePayload(payload)).rejects.toMatchObject(
        {
          response: { status: 400 },
        },
      );
    });
  });

  describe("confirmSell", () => {
    it("should reject when an invalid payload is passed", async () => {
      const payload = {
        provider: "xxx",
        sellId: "xxx",
        transactionId: "xxx",
      };

      await expect(backend.sell.confirm(payload)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });

  describe("cancelSell", () => {
    it("should reject when an invalid payload is passed", async () => {
      const payload = {
        provider: "xxx",
        sellId: "xxx",
      };

      await expect(backend.sell.cancel(payload)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });
});
