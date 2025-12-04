import axios from "axios";
import BigNumber from "bignumber.js";
import { Account } from "@ledgerhq/wallet-api-client";

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
  cancelSell,
  cancelSwap,
  confirmSell,
  confirmSwap,
  retrieveSellPayload,
  retrieveSwapPayload,
} from "./api";
import { ProductType } from "./sdk.types";
import {
  FundRequestPayload,
  FundResponsePayload,
  SellRequestPayload,
  SellResponsePayload,
} from "./api.types";

describe("Swap", () => {
  describe("retrieveSwapPayload", () => {
    afterEach(() => {
      mockPost.mockReset();
    });

    it("converts input data and output data", async () => {
      // GIVEN
      const data = {
        provider: "provider-name",
        deviceTransactionId: "4492050566",
        fromAccount: createAccount("12", "btc-account", "bitcoin", "0x998"),
        toAccount: createAccount("13", "eth-account", "ethereum", "0x999"),
        amount: BigNumber("1.908"),
        amountInAtomicUnit: BigNumber(1_908_000_000_000),
        quoteId: "978400",
      };
      const responseData = swapApiResponse();
      mockPost.mockResolvedValueOnce({ data: responseData });

      // WHEN
      const result = await retrieveSwapPayload(data);

      // THEN
      const expectedResult = {
        binaryPayload: "",
        payinAddress: "0x31137882f060458bde9e9ac3caa27b030d8f85c2",
        signature: "",
        swapId: "swap-id2",
        payinExtraId: "payinExtraId",
      };
      expect(result).toEqual(expectedResult);
      const expectedRequest = {
        provider: "provider-name",
        deviceTransactionId: "4492050566",
        from: "bitcoin",
        to: "ethereum",
        address: "0x999",
        refundAddress: "0x998",
        amountFrom: "1.908",
        amountFromInSmallestDenomination: 1908000000000,
        rateId: "978400",
      };
      expect(mockPost.mock.calls[0][0]).toEqual("v5/swap");
      expect(mockPost.mock.calls[0][1]).toEqual(expectedRequest);
    });

    it("doesn't send quoteId if there is none in the parameter", async () => {
      // GIVEN
      const data = {
        provider: "provider-name",
        deviceTransactionId: "4492050566",
        fromAccount: createAccount("12", "btc-account", "bitcoin", "0x998"),
        toAccount: createAccount("13", "eth-account", "ethereum", "0x999"),
        amount: BigNumber("1.908"),
        amountInAtomicUnit: BigNumber(1_908_000_000_000),
      };
      const responseData = swapApiResponse();
      mockPost.mockResolvedValueOnce({ data: responseData });

      // WHEN
      const result = await retrieveSwapPayload(data);

      // THEN
      expect(result).not.toBeUndefined();
      const expectedRequest = {
        provider: "provider-name",
        deviceTransactionId: "4492050566",
        from: "bitcoin",
        to: "ethereum",
        address: "0x999",
        refundAddress: "0x998",
        amountFrom: "1.908",
        amountFromInSmallestDenomination: 1908000000000,
      };
      expect(mockPost.mock.calls[0][1]).toEqual(expectedRequest);
    });
  });

  describe("confirmSwap", () => {
    afterEach(() => {
      mockPost.mockReset();
    });

    it("calls 'accepted' endpoint", async () => {
      // WHEN
      await confirmSwap({
        provider: "provider-name",
        swapId: "swap-id",
        transactionId: "transaction-id",
      });

      // THEN
      expect(mockPost.mock.calls[0][0]).toEqual("v5/swap/accepted");
    });
  });

  describe("cancelSwap", () => {
    afterEach(() => {
      mockPost.mockReset();
    });

    it("calls 'cancelled' endpoint", async () => {
      // WHEN
      await cancelSwap({
        provider: "provider-name",
        swapId: "swap-id",
      });

      // THEN
      expect(mockPost.mock.calls[0][0]).toEqual("v5/swap/cancelled");
    });
  });

  function createAccount(
    id: string,
    name: string,
    currency: string,
    address = "0x999",
  ): Account {
    return {
      id,
      name,
      address,
      currency,
      balance: new BigNumber("0"),
      spendableBalance: new BigNumber("0"),
      blockHeight: 18,
      lastSyncDate: new Date(),
    };
  }

  function swapApiResponse() {
    return {
      provider: "provider-name",
      swapId: "swap-id2",
      apiExtraFee: 1,
      apiFee: 1,
      refundAddress: "0x31137882f060458bde9e9ac3caa27b030d8f85c1",
      amountExpectedFrom: 3000,
      amountExpectedTo: 1,
      status: "finished",
      from: "ethereum/erc20/bat",
      to: "ethereum",
      payinAddress: "0x31137882f060458bde9e9ac3caa27b030d8f85c2",
      payoutAddress: "0x31137882f060458bde9e9ac3caa27b030d8f85c3",
      createdAt: "2023-07-05T22:12:15.378497Z",
      binaryPayload: "",
      signature: "",
      payinExtraId: "payinExtraId",
    };
  }
});

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
