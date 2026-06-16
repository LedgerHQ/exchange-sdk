import axios from "axios";

jest.mock("axios");
const mockPost = jest.fn();
const mockInterceptorUse = jest.fn((callback) => callback);
(axios.create as jest.Mock).mockImplementation(() => {
  return {
    post: mockPost,
    interceptors: {
      request: {
        use: mockInterceptorUse,
      },
    },
  };
});

import {
  cancelFund,
  cancelSell,
  confirmFund,
  confirmSell,
  retrieveFundPayload,
  retrieveSellPayload,
} from "./api";
import { ProductType } from "./sdk.types";
import {
  FundRequestPayload,
  FundResponsePayload,
  SellRequestPayload,
  SellResponsePayload,
} from "./api.types";

describe("Sell", () => {
  const mockQuoteId = "quoteId";
  const mockSellId = "sellId";
  const mockLedgerSessionId = "ledgerSessionId";

  afterEach(() => {
    mockPost.mockReset();
  });

  describe("confirmSell", () => {
    it("calls 'accepted' endpoint", async () => {
      await confirmSell({
        sellId: mockSellId,
        provider: "provider-name",
        transactionId: "transaction-id",
        ledgerSessionId: mockLedgerSessionId,
      });

      expect(mockPost.mock.calls[0][0]).toEqual(
        `/history/webhook/v1/transaction/${mockSellId}/accepted`,
      );
    });
  });

  describe("cancelSell", () => {
    it("calls 'cancelled' endpoint", async () => {
      await cancelSell({
        provider: "provider-name",
        sellId: mockSellId,
      });

      expect(mockPost.mock.calls[0][0]).toEqual(
        `/history/webhook/v1/transaction/${mockSellId}/cancelled`,
      );
    });
  });

  describe("retrieveSellPayload", () => {
    it("retrieves payload based on params and parses response", async () => {
      const mockAccount = "0xfff";
      const mockResponsePayload = "payload";
      const mockResponseSignature = "signature";

      const mockRetrieveSellPayloadParams: SellRequestPayload = {
        quoteId: mockQuoteId,
        provider: "",
        fromCurrency: "",
        toCurrency: "",
        refundAddress: mockAccount,
        amountFrom: 0,
        amountTo: 0,
        nonce: "",
        type: ProductType.SELL,
      };

      const { type: _type, ...expectedRequestPayload } =
        mockRetrieveSellPayloadParams;

      mockPost.mockResolvedValueOnce({
        data: {
          sellId: mockSellId,
          payinAddress: mockAccount,
          createdAt: "2023-07-05T22:12:15.378497Z",
          providerFees: 0,
          referralFees: 0,
          payoutNetworkFees: 0,
          providerSig: {
            payload: mockResponsePayload,
            signature: mockResponseSignature,
          },
        } as SellResponsePayload,
      });

      const result = await retrieveSellPayload(mockRetrieveSellPayloadParams);

      const expectedResult = {
        sellId: mockSellId,
        payinAddress: mockAccount,
        providerSig: {
          payload: mockResponsePayload,
          signature: mockResponseSignature,
        },
      };

      expect(result).toEqual(expectedResult);

      expect(mockPost.mock.calls[0][0]).toEqual(
        "exchange/v1/sell/onramp_offramp/remit",
      );
      expect(mockPost.mock.calls[0][1]).toEqual(expectedRequestPayload);
    });

    it("uses correct request url when product type is CARD", async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          sellId: "",
          payinAddress: "",
          createdAt: "",
          providerFees: 0,
          referralFees: 0,
          payoutNetworkFees: 0,
          providerSig: {
            payload: "",
            signature: "",
          },
        } as FundResponsePayload,
      });

      await retrieveSellPayload({
        quoteId: "",
        provider: "",
        fromCurrency: "",
        toCurrency: "",
        refundAddress: "",
        amountFrom: 0,
        amountTo: 0,
        nonce: "",
        type: ProductType.CARD,
      });

      expect(mockPost.mock.calls[0][0]).toEqual("exchange/v1/sell/card/remit");
    });
  });
});

describe("Fund", () => {
  const mockOrderId = "orderId";

  afterEach(() => {
    mockPost.mockReset();
  });

  describe("confirmFund", () => {
    it("calls 'accepted' endpoint", async () => {
      await confirmFund({
        quoteId: mockOrderId,
        provider: "provider-name",
        transactionId: "transaction-id",
      });

      expect(mockPost.mock.calls[0][0]).toEqual(
        `/history/webhook/v1/transaction/${mockOrderId}/accepted`,
      );
    });
  });

  describe("cancelFund", () => {
    it("calls 'cancelled' endpoint", async () => {
      await cancelFund({
        provider: "provider-name",
        quoteId: mockOrderId,
      });

      expect(mockPost.mock.calls[0][0]).toEqual(
        `/history/webhook/v1/transaction/${mockOrderId}/cancelled`,
      );
    });
  });

  describe("retrieveFundPayload", () => {
    it("retrieves payload based on params and parses response", async () => {
      const mockAccount = "0xfff";
      const mockResponsePayload = "payload";
      const mockResponseSignature = "signature";

      const mockRetrieveFundPayloadParams: FundRequestPayload = {
        quoteId: mockOrderId,
        provider: "",
        fromCurrency: "",
        toCurrency: "",
        refundAddress: mockAccount,
        amountFrom: 0,
        amountTo: 0,
        nonce: "",
        type: ProductType.CARD,
      };

      const { type: _type, ...expectedRequestPayload } =
        mockRetrieveFundPayloadParams;

      mockPost.mockResolvedValueOnce({
        data: {
          sellId: mockOrderId,
          payinAddress: mockAccount,
          createdAt: "2023-07-05T22:12:15.378497Z",
          providerFees: 0,
          referralFees: 0,
          payoutNetworkFees: 0,
          providerSig: {
            payload: mockResponsePayload,
            signature: mockResponseSignature,
          },
        } as FundResponsePayload,
      });

      const result = await retrieveFundPayload(mockRetrieveFundPayloadParams);

      const expectedResult = {
        orderId: mockOrderId,
        payinAddress: mockAccount,
        providerSig: {
          payload: mockResponsePayload,
          signature: mockResponseSignature,
        },
      };

      expect(result).toEqual(expectedResult);

      expect(mockPost.mock.calls[0][0]).toEqual("exchange/v1/fund/card/remit");
      expect(mockPost.mock.calls[0][1]).toEqual(expectedRequestPayload);
    });
  });
});
