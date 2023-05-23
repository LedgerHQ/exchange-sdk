import {
  Account,
  CryptoCurrency,
  Currency,
  Transaction,
  WalletAPIClient,
  WindowMessageTransport,
} from "@ledgerhq/wallet-api-client";
import BigNumber from "bignumber.js";
import { NonceStepError, PayloadStepError, SignatureStepError } from "./error";
import { Logger } from "./log";
import { cancelSwap, confirmSwap, retrievePayload } from "./api";

export type SwapInfo = {
  quoteId?: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmount: bigint;
  feeStrategy: FeeStrategy;
};

export type FeeStrategy = "SLOW" | "MEDIUM" | "FAST";
// export type FeeStrategy =
//   (typeof schemaExchangeComplete)["params"]["feeStrategy"];

type UserAccounts = {
  fromAccount: Account;
  toAccount: Account;
  fromCurrency: CryptoCurrency;
};

// Should be available from the WalletAPI (zod :( )
const ExchangeType = {
  FUND: "FUND",
  SELL: "SELL",
  SWAP: "SWAP",
} as const;

/**
 *
 */
// Note: maybe to use to disconnect the Transport: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
export class ExchangeSDK {
  readonly providerId: string;
  readonly walletAPI: WalletAPIClient;

  private transport: WindowMessageTransport;
  private logger: Logger = new Logger();

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
      this.walletAPI = new WalletAPIClient(this.transport);
    }
  }

  async swap(info: SwapInfo): Promise<string> {
    this.logger.log("*** Start Swap ***");

    const { fromAccountId, toAccountId, fromAmount, feeStrategy, quoteId } =
      info;
    const { fromAccount, toAccount, fromCurrency } =
      await this.retrieveUserAccounts({
        fromAccountId,
        toAccountId,
      });
    this.logger.log("User info", fromAccount, toAccount, fromCurrency);

    // 1 - Ask for deviceTransactionId
    const deviceTransactionId = await this.walletAPI.exchange
      .start(ExchangeType.SWAP)
      .catch((error: Error) => {
        throw new NonceStepError(error);
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
        // rateId: quoteId,
      }).catch((error: Error) => {
        this.logger.error(error);
        throw new PayloadStepError(error);
      });

    // 3 - Send payload
    const transaction = this.createTransaction({
      recipient: payinAddress,
      amount: fromAmount,
      family: fromCurrency.family,
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
      })
      .catch(async (error: Error) => {
        await cancelSwap(this.providerId, swapId);
        throw new SignatureStepError(error);
      });

    this.logger.log("Transaction sent:", tx);
    this.logger.log("*** End Swap ***");
    await confirmSwap(this.providerId, swapId, tx);
    return tx;
  }

  disconnect() {
    this.transport.disconnect();
  }

  private async retrieveUserAccounts(accounts: {
    fromAccountId: string;
    toAccountId: string;
  }): Promise<UserAccounts> {
    const { fromAccountId, toAccountId } = accounts;
    const allAccounts = await this.walletAPI.account.list();

    const fromAccount = allAccounts.find((value) => value.id === fromAccountId);
    const toAccount = allAccounts.find((value) => value.id === toAccountId);
    this.logger.log("retrieveUserAccounts", fromAccount);
    const fromCurrency = await this.getParentCryptoCurrency(
      fromAccount.currency
    );

    return {
      fromAccount,
      toAccount,
      fromCurrency,
    };
  }

  private async getParentCryptoCurrency(
    currencyName: string
  ): Promise<CryptoCurrency> {
    let [currency]: Array<Currency> = await this.walletAPI.currency.list({
      currencyIds: [currencyName],
    });
    if (currency.type === "TokenCurrency") {
      [currency] = await this.walletAPI.currency.list({
        currencyIds: [currency.parent],
      });
    }

    return currency;
  }

  private createTransaction({
    recipient,
    amount,
    family,
  }: {
    recipient: string;
    amount: bigint;
    family: string;
  }): Transaction {
    return {
      family,
      amount: new BigNumber(amount.toString()),
      recipient,
    };
  }
}
