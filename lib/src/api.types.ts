import { Account } from "@ledgerhq/wallet-api-client";
import BigNumber from "bignumber.js";
import { ExchangeType, ProductType } from "./sdk.types";

export type SupportedProductsByExchangeType = {
  [key in ExchangeType]: Partial<{
    [key in ProductType]: string;
  }>;
};

/**
 * SWAP *
 **/

export type SwapPayloadRequestData = {
  provider: string;
  deviceTransactionId: string;
  fromAccount: Account;
  toAccount: Account;
  amount: BigNumber;
  amountInAtomicUnit: BigNumber;
  quoteId?: string;
  toNewTokenId?: string;
};
export type SwapPayloadResponse = {
  binaryPayload: string;
  signature: string;
  payinAddress: string;
  swapId: string;
  payinExtraId?: string;
  extraTransactionParameters?: string;
};

export type ConfirmSwapRequest = {
  provider: string;
  swapId: string;
  transactionId: string;
  sourceCurrencyId?: string;
  targetCurrencyId?: string;
  hardwareWalletType?: string;
};

export type CancelSwapRequest = {
  provider: string;
  swapId: string;
  statusCode?: string;
  errorMessage?: string;
  sourceCurrencyId?: string;
  targetCurrencyId?: string;
  hardwareWalletType?: string;
  swapType?: string;
  swapStep?: string;
};

export type SwapBackendResponse = {
  provider: string;
  swapId: string;
  apiExtraFee: number;
  apiFee: number;
  refundAddress: string;
  amountExpectedFrom: number;
  amountExpectedTo: number;
  status: string;
  from: string;
  to: string;
  payinAddress: string;
  payoutAddress: string;
  createdAt: string; // ISO-8601
  binaryPayload: string;
  signature: string;
  payinExtraId?: string;
  extraTransactionParameters?: string;
};

/**
 * SELL *
 **/

export type ConfirmSellRequest = {
  provider: string;
  quoteId: string;
  transactionId: string;
};

export type CancelSellRequest = {
  provider: string;
  quoteId: string;
  statusCode?: string;
  errorMessage?: string;
};

export interface SellRequestPayload {
  quoteId: string;
  provider: string;
  fromCurrency: string;
  toCurrency: string;
  refundAddress: string;
  amountFrom: number;
  amountTo: number;
  nonce: string;
  type: ProductType;
}

export interface SellResponsePayload {
  sellId: string;
  payinAddress: string;
  createdAt: string;
  providerFees: number;
  referralFees: number;
  payoutNetworkFees: number;
  providerSig: {
    payload: string;
    signature: string;
  };
}

/**
 * FUND *
 **/

export type ConfirmFundRequest = {
  provider: string;
  orderId: string;
  transactionId: string;
};

export type CancelFundRequest = {
  provider: string;
  orderId: string;
  statusCode?: string;
  errorMessage?: string;
};

export interface FundRequestPayload {
  orderId: string;
  provider: string;
  fromCurrency: string;
  refundAddress: string;
  amountFrom: number;
  nonce: string;
  type: ProductType;
}

export interface FundResponsePayload {
  sellId: string;
  payinAddress: string;
  createdAt: string;
  providerFees: number;
  referralFees: number;
  payoutNetworkFees: number;
  providerSig: {
    payload: string;
    signature: string;
  };
}

/**
 * TOKEN APROVAL *
 **/

export type ConfirmTokenApprovalRequest = {
  provider: string;
  orderId: string;
  transactionId: string;
};

export type CancelTokenApprovalRequest = {
  provider: string;
  orderId: string;
  statusCode?: string;
  errorMessage?: string;
};

export interface TokenApprovalRequestPayload {
  orderId: string;
  provider: string;
  currency: string;
  refundAddress: string;
  amount: number;
  type: ProductType;
}

export interface TokenApprovalResponsePayload {
  orderId: string;
  payinAddress: string;
  createdAt: string;
  payload: string;
}
