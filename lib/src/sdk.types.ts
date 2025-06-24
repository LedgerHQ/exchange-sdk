import BigNumber from "bignumber.js";
import {
  ExchangeCompleteParams,
  ExchangeModule,
} from "@ledgerhq/wallet-api-exchange-module";
import { GetSwapPayload } from "./sdk";
import { Transaction } from "@ledgerhq/wallet-api-client";

export type FeeStrategy = "SLOW" | "MEDIUM" | "FAST" | "CUSTOM";

export enum FeeStrategyEnum {
  SLOW = "SLOW",
  MEDIUM = "MEDIUM",
  FAST = "FAST",
  CUSTOM = "CUSTOM",
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

//TODO: remove after upgrading @ledgerhq/wallet-api-exchange-module
// extented type to include paramas as string for binaryPayload and signature
export type ExtendedExchangeModule = ExchangeModule & {
  completeSell: (params: {
    provider: string;
    fromAccountId: string;
    transaction: Transaction;
    binaryPayload: Buffer | string;
    signature: Buffer | string; // Custom update to accept Buffer or string
    feeStrategy: ExchangeCompleteParams["feeStrategy"];
  }) => Promise<string>;
};

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

export type BEData = {
  quoteId: string;
  inAmount: number;
  outAmount: number;
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
  beData: BEData;
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
