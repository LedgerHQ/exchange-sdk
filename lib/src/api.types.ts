import { ExchangeType, ProductType } from "./sdk.types";

export type SupportedProductsByExchangeType = {
  [key in ExchangeType]: Partial<{
    [key in ProductType]: string;
  }>;
};

/**
 * SELL *
 **/

export type ConfirmSellRequest = {
  provider: string;
  sellId: string;
  transactionId: string;
  ledgerSessionId?: string;
};

export type CancelSellRequest = {
  provider: string;
  sellId: string;
  statusCode?: string;
  errorMessage?: string;
  ledgerSessionId?: string;
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
  quoteId: string;
  transactionId: string;
};

export type CancelFundRequest = {
  provider: string;
  quoteId: string;
  statusCode?: string;
  errorMessage?: string;
};

export interface FundRequestPayload {
  quoteId: string;
  provider: string;
  fromCurrency: string;
  amountFrom: number;
  refundAddress: string;
  nonce: string;
  type: ProductType;
  amountTo: number;
  toCurrency: string;
}

export interface FundResponsePayload {
  sellId: string;
  payinAddress: string;
  createdAt: string;
  providerFees: number;
  referralFees: number;
  payoutNetworkFees: number;
  providerSig: {
    payload: Buffer | string;
    signature: Buffer | string;
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
