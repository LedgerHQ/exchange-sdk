import {
  Account,
  CryptoCurrency,
  Currency,
  Transaction,
  WalletAPIClient,
  WindowMessageTransport,
} from "@ledgerhq/wallet-api-client";
import BigNumber from "bignumber.js";
import {
  NonceStepError,
  NotEnoughFunds,
  PayloadStepError,
  SignatureStepError,
  ListAccountError,
  ListCurrencyError,
  UnknonwAccountError,
} from "./error";
import { Logger } from "./log";
import { cancelSwap, confirmSwap, retrievePayload } from "./api";

/**
 * Swap information required to request user's a swap transaction.
 */
export type SwapInfo = {
  quoteId?: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmount: BigNumber;
  feeStrategy: FeeStrategy;
  customFeeConfig?: {
    [key: string]: BigNumber;
  };
  rate: number;
};

export type FeeStrategy = "SLOW" | "MEDIUM" | "FAST" | "CUSTOM";

type UserAccounts = {
  fromAccount: Account;
  toAccount: Account;
  fromCurrency: Currency;
};

// Should be available from the WalletAPI (zod :( )
const ExchangeType = {
  FUND: "FUND",
  SELL: "SELL",
  SWAP: "SWAP",
} as const;

/**
 * ExchangeSDK allows you to send a swap request to Ledger Device, through a Ledger Live request.
 * Under the hood it relies on {@link https://github.com/LedgerHQ/wallet-api WalletAPI}.
 */
// Note: maybe to use to disconnect the Transport: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
export class ExchangeSDK {
  readonly providerId: string;
  readonly walletAPI: WalletAPIClient;

  private transport: WindowMessageTransport | undefined;
  private logger: Logger = new Logger();

  /**
   *
   * @param {string} providerId - Your providerId that Ledger has assign you.
   * @param {WindowMessageTransport} transport
   * @param {WalletAPIClient} walletAPI
   */
  constructor(
    providerId: string,
    transport?: WindowMessageTransport,
    walletAPI?: WalletAPIClient
  ) {
    this.providerId = providerId;
    if (!walletAPI) {
      if (!transport) {
        this.transport = new WindowMessageTransport();
        this.transport.connect();
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: this.transport is really assigned before being used
      this.walletAPI = new WalletAPIClient(this.transport);
    } else {
      this.walletAPI = walletAPI;
    }
  }

  /**
   * Ask user to validate a swap transaction.
   * @param {SwapInfo} info - Information necessary to create a swap transaction {@see SwapInfo}.
   * @return {Promise} Promise of hash of send transaction.
   * @throws {ExchangeError}
   */
  async swap(info: SwapInfo): Promise<string | void> {
    this.logger.log("*** Start Swap ***");

    const {
      fromAccountId,
      toAccountId,
      fromAmount,
      feeStrategy,
      customFeeConfig = {},
      rate,
      quoteId,
    } = info;
    const userAccounts = await this.retrieveUserAccounts({
      fromAccountId,
      toAccountId,
    }).catch((error: Error) => {
      throw error;
    });
    const { fromAccount, toAccount, fromCurrency } = userAccounts || {};
    if (!(fromAccount && toAccount && fromCurrency))
      return void this.logger.log(
        "User info",
        fromAccount,
        toAccount,
        fromCurrency
      );

    // Check enough fund
    const fromAmountAtomic = convertToAtomicUnit(fromAmount, fromCurrency);
    if (canSpendAmount(fromAccount, fromAmountAtomic) === false) {
      const err = new NotEnoughFunds();
      this.logger.error(err);
      throw err;
    }

    // 1 - Ask for deviceTransactionId
    const deviceTransactionId = await this.walletAPI.exchange
      .start(ExchangeType.SWAP)
      .catch((error: Error) => {
        const err = new NonceStepError(error);
        this.logger.error(err);
        throw err;
      });
    this.logger.debug("DeviceTransactionId retrieved:", deviceTransactionId);

    // 2 - Ask for payload creation
    const { binaryPayload, signature, payinAddress, swapId } =
      await retrievePayload({
        provider: this.providerId,
        deviceTransactionId,
        fromAccount: fromAccount,
        toAccount: toAccount,
        amount: fromAmount,
        amountInAtomicUnit: BigInt("0"),
        quoteId,
      }).catch((error: Error) => {
        const err = new PayloadStepError(error);
        this.logger.error(err);
        throw err;
      });

    // 3 - Send payload
    const transaction = await this.createTransaction({
      recipient: payinAddress,
      amount: fromAmountAtomic,
      currency: fromCurrency,
      customFeeConfig,
    });

    const tx = await this.walletAPI.exchange
      .completeSwap({
        provider: this.providerId,
        fromAccountId,
        toAccountId,
        transaction,
        binaryPayload,
        signature,
        feeStrategy,
        swapId,
        rate,
      })
      .catch(async (error: Error) => {
        await cancelSwap(this.providerId, swapId);
        const err = new SignatureStepError(error);
        this.logger.error(err);
        throw err;
      });

    this.logger.log("Transaction sent:", tx);
    this.logger.log("*** End Swap ***");
    await confirmSwap(this.providerId, swapId, tx);
    return tx;
  }

  /**
   * Convenient method to disconnect this instance to the
   * {@link https://github.com/LedgerHQ/wallet-api WalletAPI} server.
   */
  disconnect() {
    this.transport?.disconnect();
  }

  private async retrieveUserAccounts(accounts: {
    fromAccountId: string;
    toAccountId: string;
  }): Promise<UserAccounts> {
    const { fromAccountId, toAccountId } = accounts;
    const allAccounts = await this.walletAPI.account
      .list()
      .catch(async (error: Error) => {
        const err = new ListAccountError(error);
        this.logger.error(err);
        throw err;
        return [];
      });

    const fromAccount = allAccounts.find((value) => value.id === fromAccountId);
    if (!fromAccount) {
      const err = new UnknonwAccountError(new Error("Unknonw fromAccountId"));
      this.logger.error(err);
      throw err;
    }
    const toAccount = allAccounts.find((value) => value.id === toAccountId);
    if (!toAccount) {
      const err = new UnknonwAccountError(new Error("Unknonw toAccountId"));
      this.logger.error(err);
      throw err;
    }
    const [fromCurrency]: Array<Currency> = await this.walletAPI.currency
      .list({
        currencyIds: [fromAccount.currency],
      })
      .catch(async (error: Error) => {
        const err = new ListCurrencyError(error);
        this.logger.error(err);
        throw err;
        return [];
      });
    if (!fromCurrency) {
      const err = new UnknonwAccountError(new Error("Unknonw fromCurrency"));
      this.logger.error(err);
      throw err;
    }
    return {
      fromAccount,
      toAccount,
      fromCurrency,
    };
  }

  private async createTransaction({
    recipient,
    amount,
    currency,
    customFeeConfig,
  }: {
    recipient: string;
    amount: BigNumber;
    currency: Currency;
    customFeeConfig: {
      [key: string]: BigNumber;
    };
  }): Promise<Transaction> {
    let family: Transaction["family"];
    if (currency.type === "TokenCurrency") {
      const currencies = await this.walletAPI.currency.list({
        currencyIds: [currency.parent],
      });

      family = (currencies[0] as CryptoCurrency).family;
    } else {
      family = currency.family;
    }

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
}

function canSpendAmount(account: Account, amount: BigNumber): boolean {
  return account.spendableBalance.isGreaterThanOrEqualTo(amount);
}

function convertToAtomicUnit(amount: BigNumber, currency: Currency): BigNumber {
  return amount.shiftedBy(currency.decimals);
}
