import {
  Account,
  CryptoCurrency,
  Currency,
  Transaction,
  WalletAPIClient,
  WindowMessageTransport,
  defaultLogger,
} from "@ledgerhq/wallet-api-client";
import { ExchangeModule } from "@ledgerhq/wallet-api-exchange-module";
import BigNumber from "bignumber.js";
import {
  NonceStepError,
  NotEnoughFunds,
  PayloadStepError,
  CancelStepError,
  ConfirmStepError,
  SignatureStepError,
  ListAccountError,
  ListCurrencyError,
  UnknownAccountError,
} from "./error";
import { Logger } from "./log";
import { cancelSwap, confirmSwap, retrievePayload, setBackendUrl } from "./api";

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
  toNewTokenId?: string;
};

export type SellInfo = {
  quoteId?: string;
  accountId: string;
  amount: BigNumber;
  feeStrategy: FeeStrategy;
  customFeeConfig?: {
    [key: string]: BigNumber;
  };
  getSellDestinationAccount: (
    nonce: string,
    sellAddress: string,
    amount: BigNumber
  ) => Promise<{
    recipientAddress: string;
    amount: BigNumber;
    binaryPayload: Buffer;
    signature: Buffer;
  }>;
};

export type FeeStrategy = "SLOW" | "MEDIUM" | "FAST" | "CUSTOM";

type UserAccount = {
  account: Account;
  currency: Currency;
};

// Should be available from the WalletAPI (zod :( )
const ExchangeType = {
  FUND: "FUND",
  SELL: "SELL",
  SWAP: "SWAP",
  FUND_NG: "FUND_NG",
  SELL_NG: "SELL_NG",
  SWAP_NG: "SWAP_NG",
} as const;

function getCustomModule(client: WalletAPIClient) {
  return {
    exchange: new ExchangeModule(client),
  };
}

/**
 * ExchangeSDK allows you to send a swap request to Ledger Device, through a Ledger Live request.
 * Under the hood it relies on {@link https://github.com/LedgerHQ/wallet-api WalletAPI}.
 */
// Note: maybe to use to disconnect the Transport: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
export class ExchangeSDK {
  readonly providerId: string;
  readonly walletAPI: WalletAPIClient<typeof getCustomModule>;

  private transport: WindowMessageTransport | undefined;
  private logger: Logger = new Logger(true);

  /**
   *
   * @param {string} providerId - Your providerId that Ledger has assign you.
   * @param {WindowMessageTransport} transport
   * @param {WalletAPIClient} walletAPI
   * @param {string} customUrl - Backend url environment
   */
  constructor(
    providerId: string,
    transport?: WindowMessageTransport,
    walletAPI?: WalletAPIClient<typeof getCustomModule>,
    customUrl?: string
  ) {
    this.providerId = providerId;
    if (!walletAPI) {
      if (!transport) {
        this.transport = new WindowMessageTransport();
        this.transport.connect();
      } else {
        this.transport = transport;
      }

      this.walletAPI = new WalletAPIClient(
        this.transport,
        defaultLogger,
        getCustomModule
      );
    } else {
      this.walletAPI = walletAPI;
    }

    if (customUrl) {
      // Set API environment
      setBackendUrl(customUrl);
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
      toNewTokenId,
    } = info;
    const { account: fromAccount, currency: fromCurrency } =
      await this.retrieveUserAccount(fromAccountId).catch((error: Error) => {
        throw error;
      });
    const { account: toAccount } = await this.retrieveUserAccount(
      toAccountId
    ).catch((error: Error) => {
      throw error;
    });

    // Check enough fund
    const fromAmountAtomic = convertToAtomicUnit(fromAmount, fromCurrency);
    if (canSpendAmount(fromAccount, fromAmountAtomic) === false) {
      const err = new NotEnoughFunds();
      this.logger.error(err);
      throw err;
    }

    // 1 - Ask for deviceTransactionId
    const deviceTransactionId = await this.walletAPI.custom.exchange
      .startSwap({ 
        exchangeType: ExchangeType.SWAP, 
        provider: this.providerId, 
        fromAccountId, 
        toAccountId, 
        tokenCurrency: toNewTokenId || ''
      })
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
        toNewTokenId,
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

    const tx = await this.walletAPI.custom.exchange
      .completeSwap({
        provider: this.providerId,
        fromAccountId,
        toAccountId, // this attribute will point the parent account when the token is new.
        transaction,
        binaryPayload: binaryPayload as any, // TODO fix later when customAPI types are fixed
        signature: signature as any, // TODO fix later when customAPI types are fixed
        feeStrategy,
        swapId,
        rate,
        tokenCurrency: toNewTokenId,
      })
      .catch(async (error: Error) => {
        await cancelSwap(this.providerId, swapId).catch(
          async (error: Error) => {
            const err = new CancelStepError(error);
            this.logger.error(err);
            throw err;
          }
        );
        const err = new SignatureStepError(error);
        this.logger.error(err);
        throw err;
      });

    this.logger.log("Transaction sent:", tx);
    this.logger.log("*** End Swap ***");
    await confirmSwap(this.providerId, swapId, tx).catch(
      async (error: Error) => {
        const err = new ConfirmStepError(error);
        this.logger.error(err);
        throw err;
      }
    );
    return tx;
  }

  /**
   * Ask user to validate a sell transaction.
   * @param {SwapInfo} info - Information necessary to create a sell transaction {@see SwapInfo}.
   * @return {Promise} Promise of hash of send transaction.
   * @throws {ExchangeError}
   */
  async sell(info: SellInfo): Promise<string | void> {
    this.logger.log("*** Start Sell ***");

    const {
      accountId,
      feeStrategy,
      customFeeConfig = {},
      getSellDestinationAccount,
    } = info;

    const { account, currency } = await this.retrieveUserAccount(accountId);

    // 1 - Ask for deviceTransactionId
    const deviceTransactionId = await this.walletAPI.exchange
      .start(ExchangeType.SELL_NG)
      .catch((error: Error) => {
        const err = new NonceStepError(error);
        this.logger.error(err);
        throw err;
      });
    this.logger.debug("DeviceTransactionId retrieved:", deviceTransactionId);

    // 2 - Ask for payload creation
    this.logger.log("Call getSellDestinationAccount");
    const { recipientAddress, amount, binaryPayload, signature } =
      await getSellDestinationAccount(
        deviceTransactionId,
        account.address,
        info.amount
      );

    // 3 - Send payload
    const transaction = await this.createTransaction({
      recipient: recipientAddress,
      amount,
      currency,
      customFeeConfig,
    });

    const tx = await this.walletAPI.exchange
      .completeSell({
        provider: this.providerId,
        fromAccountId: accountId,
        transaction,
        binaryPayload,
        signature,
        feeStrategy,
      })
      .catch(async (error: Error) => {
        const err = new SignatureStepError(error);
        this.logger.error(err);
        throw err;
      });

    this.logger.log("Transaction sent:", tx);
    this.logger.log("*** End Sell ***");

    return tx;
  }

  /**
   * Convenient method to disconnect this instance to the
   * {@link https://github.com/LedgerHQ/wallet-api WalletAPI} server.
   */
  disconnect() {
    this.transport?.disconnect();
  }

  private async retrieveUserAccount(accountId: string): Promise<UserAccount> {
    const allAccounts = await this.walletAPI.account
      .list()
      .catch(async (error: Error) => {
        const err = new ListAccountError(error);
        this.logger.error(err);
        throw err;
      });

    const account = allAccounts.find((value) => value.id === accountId);
    if (!account) {
      const err = new UnknownAccountError(new Error("Unknown accountId"));
      this.logger.error(err);
      throw err;
    }

    const [currency]: Array<Currency> = await this.walletAPI.currency
      .list({
        currencyIds: [account.currency],
      })
      .catch(async (error: Error) => {
        const err = new ListCurrencyError(error);
        this.logger.error(err);
        throw err;
      });
    if (!currency) {
      const err = new UnknownAccountError(new Error("Unknown fromCurrency"));
      this.logger.error(err);
      throw err;
    }

    return {
      account,
      currency,
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

    // TODO: remove next line when wallet-api support btc utxoStrategy
    delete customFeeConfig.utxoStrategy;

    switch (family) {
      case "bitcoin":
      case "ethereum":
      case "algorand":
      case "crypto_org":
      case "ripple": // Todo check InitSwap 
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
