import {
  Account,
  Currency,
  Transaction,
  TransactionCommon,
  WalletAPIClient,
} from "@ledgerhq/wallet-api-client";
import BigNumber from "bignumber.js";

export type UserAccount = {
  account: Account;
  currency: Currency;
};

export type TransactionWithCustomFee = TransactionCommon & {
  customFeeConfig: {
    [key: string]: BigNumber;
  };
  payinExtraId?: string;
  extraTransactionParameters?: string;
};

// Define a specific type for the strategy functions, assuming they might need parameters
export type TransactionStrategyFunction = (
  params: TransactionWithCustomFee,
) => Transaction;

export type CreateTransactionArg = {
  recipient: string;
  amount: BigNumber;
  currency: Currency;
  customFeeConfig: {
    [key: string]: BigNumber;
  };
  payinExtraId?: string;
  extraTransactionParameters?: string;
};

export type WalletApiDecorator = {
  walletClient: WalletAPIClient;
  retrieveUserAccount: (accountId: string) => Promise<UserAccount>;
  createTransaction: (arg: CreateTransactionArg) => Promise<Transaction>;
};
