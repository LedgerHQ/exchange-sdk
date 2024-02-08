import {
  Account,
  CryptoCurrency,
  Currency,
  Transaction,
  WalletAPIClient,
} from "@ledgerhq/wallet-api-client";
import {
  ListAccountError,
  ListCurrencyError,
  UnknownAccountError,
} from "./error";
import BigNumber from "bignumber.js";
import { ExchangeModule } from "@ledgerhq/wallet-api-client/lib/modules/Exchange";

export type UserAccount = {
  account: Account;
  currency: Currency;
};

export type WalletAPIClientDecorator = ReturnType<typeof walletApiDecorator>;
export type CreateTransactionArg = {
  recipient: string;
  amount: BigNumber;
  currency: Currency;
  customFeeConfig: {
    [key: string]: BigNumber;
  };
};

export type WalletApiDecorator = {
  walletClient: WalletAPIClient;
  retrieveUserAccount: (accountId: string) => Promise<UserAccount>;
  createTransaction: (arg: CreateTransactionArg) => Promise<Transaction>;
};

export default function walletApiDecorator(
  walletAPIClient: WalletAPIClient<typeof getCustomModule>
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
  }: CreateTransactionArg): Promise<Transaction> {
    let family: Transaction["family"];
    if (currency.type === "TokenCurrency") {
      const currencies = await walletAPI.currency.list({
        currencyIds: [currency.parent],
      });

      family = (currencies[0] as CryptoCurrency).family;
    } else {
      family = currency.family;
    }

    // TODO: remove next line when wallet-api support btc utxoStrategy
    delete customFeeConfig.utxoStrategy;

    switch (family) {
      case "bitcoin":
      case "ethereum":
      case "algorand":
      case "crypto_org":
      case "ripple":
      case "cosmos":
      case "celo":
      case "hedera":
      case "filecoin":
      case "tezos":
      case "polkadot":
      case "stellar":
      case "tron":
      case "neo":
        return {
          family,
          amount,
          recipient,
          ...customFeeConfig,
        } as Transaction; // If we don't cast into Transaction, we have compilation error with SolanaTransaction missing parameter. However we previously filter to not manage Solana family.
      case "near":
        return {
          family,
          amount,
          recipient,
          ...customFeeConfig,
          mode: "send", //??
        };
      case "cardano":
        return {
          family,
          amount,
          recipient,
          ...customFeeConfig,
          mode: "send",
        };
      case "elrond":
        return {
          family,
          amount,
          recipient,
          gasLimit: 0, //FIXME
          ...customFeeConfig,
          mode: "send", //??
        };
      case "solana":
        return {
          family,
          amount,
          recipient,
          ...customFeeConfig,
          model: { kind: "transfer", uiState: {} },
        };
    }
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
