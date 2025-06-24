import BigNumber from "bignumber.js";
import { GetSwapPayload } from "./sdk";

export type FeeStrategy = "slow" | "medium" | "fast" | "custom";

export enum FeeStrategyEnum {
  SLOW = "slow",
  MEDIUM = "medium",
  FAST = "fast",
  CUSTOM = "custom",
}

export enum ExchangeType {
  SWAP = "SWAP",
  SELL = "SELL",
  FUND = "FUND",
}

export enum ProductType {
  SWAP = "SWAP",
  SELL = "SELL",
  CARD = "CARD",
}

/**
 * Swap information required to request a user's swap transaction.
 */
export type SwapInfo = {
  quoteId?: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmount: BigNumber;
  feeStrategy: FeeStrategy;
  customFeeConfig?: { [key: string]: BigNumber };
  rate: number;
  toNewTokenId?: string;
  getSwapPayload?: GetSwapPayload;
};

/**
 * Sell information required to request a user's sell transaction.
 */
export type SellInfo = {
  quoteId?: string;
  fromAccountId: string;
  fromAmount: BigNumber;
  toFiat?: string;
  feeStrategy?: FeeStrategy;
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
  orderId?: string;
  fromAccountId: string;
  fromAmount: BigNumber;
  feeStrategy?: FeeStrategy;
  customFeeConfig?: { [key: string]: BigNumber };
  type?: ProductType;
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
