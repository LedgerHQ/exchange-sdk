import BigNumber from "bignumber.js";

export type FeeStrategy = "slow" | "medium" | "fast" | "custom";

export enum FeeStrategyEnum {
  SLOW = "slow",
  MEDIUM = "medium",
  FAST = "fast",
  CUSTOM = "custom",
}

export enum ExchangeType {
  SELL = "SELL",
  FUND = "FUND",
}

export enum ProductType {
  SELL = "SELL",
  CARD = "CARD",
}

/**
 * Sell information required to request a user's sell transaction.
 */
export type SellInfo = {
  quoteId?: string;
  fromAccountId: string;
  fromAmount: BigNumber;
  toFiat?: string;
  feeStrategy?: FeeStrategy;
  ledgerSessionId?: string;
  rate?: number;
  customFeeConfig?: { [key: string]: BigNumber };
  getSellPayload?: GetSellPayload;
  type?: ProductType;
};

export type GetSellPayload = (
  nonce: string,
  sellAddress: string,
  amount: BigNumber,
) => Promise<{
  recipientAddress: string;
  amount: BigNumber;
  binaryPayload: string;
  signature: Buffer;
  sellId: string;
}>;

/**
 * Fund information required to request a user's fund transaction.
 */
export type FundInfo = {
  quoteId?: string;
  fromAccountId: string;
  fromAmount: BigNumber;
  feeStrategy?: FeeStrategy;
  customFeeConfig?: { [key: string]: BigNumber };
  type?: ProductType;
  // TODO: confirm if required, optional for now and will default to fromCurrency & fromAmount
  toCurrency?: string;
  toAmount?: BigNumber;
};

/**
 * TokenApproval information required to request a user's token approval transaction.
 */
export type TokenApprovalInfo = {
  orderId: string;
  userAccountId: string;
  smartContractAddress: string;
  approval: {
    amount?: BigNumber;
  };
  rawTx: string;
};
