import {
  cancelSell,
  confirmSell,
  postSellPayload,
  retrieveSellPayload,
} from "../../src/api";
import { ProductType } from "../../src/sdk.types";

describe("Api >> Sell", () => {
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

      await expect(retrieveSellPayload(payload)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });

  describe("postSellPayload", () => {
    it("should reject when an invalid payload is passed", async () => {
      jest.spyOn(console, "log").mockImplementation(() => {});
      const coefficient = new Uint8Array([0x04, 0xd2]);
      const payload = {
        deviceTransactionId: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
        inAddress: "xxx",
        inAmount: new Uint8Array(Buffer.from([0x04, 0xd2])),
        inCurrency: "XXX",
        outAmount: { coefficient: new Uint8Array([0x49, 0x27, 0xc5, 0x00]), exponent: -8 },
        outCurrency: "YYY",
        traderEmail: "",
      };

      const result = await postSellPayload(payload, "provider123");

      expect(result).toBeUndefined();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Error posting payload"),
        expect.objectContaining({
          response: expect.objectContaining({
            status: 400,
          }),
        }),
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

      await expect(confirmSell(payload)).rejects.toMatchObject({
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

      await expect(cancelSell(payload)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });
});
