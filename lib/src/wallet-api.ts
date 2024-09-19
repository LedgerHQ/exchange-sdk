import {
  Account,
  CryptoCurrency,
  Currency,
  ElrondTransaction,
  RippleTransaction,
  SolanaTransaction,
  StellarTransaction,
  Transaction,
  TransactionCommon,
  WalletAPIClient,
} from "@ledgerhq/wallet-api-client";
import {
  ListAccountError,
  ListCurrencyError,
  PayinExtraIdError,
  UnknownAccountError,
} from "./error";
import BigNumber from "bignumber.js";
import { ExchangeModule } from "@ledgerhq/wallet-api-exchange-module";

export type UserAccount = {
  account: Account;
  currency: Currency;
};

type TransactionWithCustomFee = TransactionCommon & {
  customFeeConfig: {
    [key: string]: BigNumber;
  };
  payinExtraId?: string;
  extraTransactionParameters?: string;
};

// Define a specific type for the strategy functions, assuming they might need parameters
type TransactionStrategyFunction = (
  params: TransactionWithCustomFee,
) => Transaction;

const transactionStrategy: {
  [K in Transaction["family"]]: TransactionStrategyFunction;
} = {
  algorand: defaultTransaction,
  bitcoin: bitcoinTransaction,
  cardano: modeSendTransaction,
  celo: defaultTransaction,
  cosmos: defaultTransaction,
  crypto_org: defaultTransaction,
  elrond: elrondTransaction,
  ethereum: withoutGasLimitTransaction,
  filecoin: defaultTransaction,
  hedera: defaultTransaction,
  near: modeSendTransaction,
  neo: defaultTransaction,
  polkadot: defaultTransaction,
  ripple: rippleTransaction,
  solana: solanaTransaction,
  stacks: defaultTransaction,
  stellar: stellarTransaction,
  tezos: modeSendTransaction,
  tron: modeSendTransaction,
  vechain: defaultTransaction,
  casper: defaultTransaction,
  internet_computer: defaultTransaction,
};

export type WalletAPIClientDecorator = ReturnType<typeof walletApiDecorator>;
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

export default function walletApiDecorator(
  walletAPIClient: WalletAPIClient,
): WalletApiDecorator {
  const walletAPI = walletAPIClient;

  async function retrieveUserAccount(accountId: string): Promise<UserAccount> {
    const allAccounts = await walletAPI.account
      .list()
      .catch(async (error: Error) => {
        const err = new ListAccountError(error);
        throw err;
      });

    const account = allAccounts.find((value) => value.id === accountId);
    if (!account) {
      const err = new UnknownAccountError(new Error("Unknown accountId"));
      throw err;
    }

    const [currency]: Array<Currency> = await walletAPI.currency
      .list({
        currencyIds: [account.currency],
      })
      .catch(async (error: Error) => {
        const err = new ListCurrencyError(error);
        throw err;
      });
    if (!currency) {
      const err = new UnknownAccountError(new Error("Unknown fromCurrency"));
      throw err;
    }

    return {
      account,
      currency,
    };
  }

async function createTransaction({
    recipient,
    amount,
    currency,
    customFeeConfig,
    payinExtraId,
    extraTransactionParameters,
  }: CreateTransactionArg): Promise<Transaction> {
    let family: Transaction["family"];
    if (currency.type === "TokenCurrency") {
      const currencies = await walletAPI.currency.list({
        currencyIds: [currency.parent],
      });

      family = (currencies[0] as CryptoCurrency)
        .family as Transaction["family"];
    } else {
      family = currency.family as Transaction["family"];
    }

    // TODO: remove next line when wallet-api support btc utxoStrategy
    delete customFeeConfig.utxoStrategy;

    const strategy = transactionStrategy[family];

    if (!strategy) {
      throw new Error(`No strategy found for family: ${family}`);
    }

    return strategy({
      family,
      amount,
      recipient,
      customFeeConfig,
      payinExtraId,
      smartContractData: extraTransactionParameters,
    });
  }

  return {
    retrieveUserAccount,
    createTransaction,
    walletClient: walletAPIClient,
  };
}

export function getCustomModule(client: WalletAPIClient) {
  return {
    exchange: new ExchangeModule(client),
  };
}

export function defaultTransaction({
  family,
  amount,
  recipient,
  customFeeConfig,
}: TransactionWithCustomFee): Transaction {
  return {
    family,
    amount,
    recipient,
    ...customFeeConfig,
  } as Transaction;
}

export function modeSendTransaction({
  family,
  amount,
  recipient,
  customFeeConfig,
}: TransactionWithCustomFee): Transaction {
  return {
    ...defaultTransaction({ family, amount, recipient, customFeeConfig }),
    mode: "send",
  };
}

export function stellarTransaction({
  family,
  amount,
  recipient,
  customFeeConfig,
  payinExtraId,
}: TransactionWithCustomFee): StellarTransaction {
  if (!payinExtraId) throw new PayinExtraIdError();

  return {
    ...defaultTransaction({ family, amount, recipient, customFeeConfig }),
    memoValue: payinExtraId,
    memoType: "MEMO_TEXT",
  } as StellarTransaction;
}

export function rippleTransaction({
  family,
  amount,
  recipient,
  customFeeConfig,
  payinExtraId,
}: TransactionWithCustomFee): RippleTransaction {
  if (!payinExtraId) throw new PayinExtraIdError();

  return {
    ...defaultTransaction({ family, amount, recipient, customFeeConfig }),
    tag: new BigNumber(payinExtraId).toNumber(),
  } as RippleTransaction;
}

// Function to remove gasLimit from customFeeConfig for Ethereum or Bitcoin
export function withoutGasLimitTransaction({
  family,
  amount,
  recipient,
  customFeeConfig,
}: TransactionWithCustomFee): Transaction {
  delete customFeeConfig.gasLimit;
  return defaultTransaction({ family, amount, recipient, customFeeConfig });
}

export function bitcoinTransaction({
  family,
  amount,
  recipient,
  customFeeConfig,
  extraTransactionParameters
}: TransactionWithCustomFee): Transaction {
  if (extraTransactionParameters)
    {
    return {
      family,
      amount,
      recipient,
      ...customFeeConfig,
      opReturnData: Buffer.from(extraTransactionParameters, "utf-8"),
    } as Transaction;
  }
  return {
    family,
    amount,
    recipient,
    ...customFeeConfig,
  } as Transaction;
}

export function solanaTransaction({
  family,
  amount,
  recipient,
  customFeeConfig,
}: TransactionWithCustomFee): SolanaTransaction {
  return {
    ...defaultTransaction({ family, amount, recipient, customFeeConfig }),
    model: { kind: "transfer", uiState: {} },
  } as SolanaTransaction;
}

export function elrondTransaction({
  family,
  amount,
  recipient,
  customFeeConfig,
}: TransactionWithCustomFee): ElrondTransaction {
  return {
    ...modeSendTransaction({ family, amount, recipient, customFeeConfig }),
    gasLimit: 0, // FIXME: Placeholder, adjust as needed
  } as ElrondTransaction;
}