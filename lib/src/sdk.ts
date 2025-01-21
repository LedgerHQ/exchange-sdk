import BigNumber from "bignumber.js";
import {
  Account,
  Currency,
  Transaction,
  Transport,
  WalletAPIClient,
  WindowMessageTransport,
  defaultLogger,
} from "@ledgerhq/wallet-api-client";
import {
  ExchangeCompleteParams,
  ExchangeModule,
} from "@ledgerhq/wallet-api-exchange-module";

import {
  cancelSwap,
  confirmSwap,
  cancelSell,
  confirmSell,
  decodeSellPayloadAndPost,
  retrieveSellPayload,
  retrieveSwapPayload,
  setBackendUrl,
  retrieveFundPayload,
  cancelFund,
  confirmFund,
} from "./api";
import { CompleteExchangeError } from "./error/SwapError";
import { handleErrors } from "./error/handleErrors";
import { Logger } from "./log";
import walletApiDecorator, {
  type WalletApiDecorator,
  getCustomModule,
} from "./wallet-api";
import { parseError, StepError } from "./error/parser";

export type FeeStrategy = "SLOW" | "MEDIUM" | "FAST" | "CUSTOM";

enum FeeStrategyEnum {
  SLOW = "SLOW",
  MEDIUM = "MEDIUM",
  FAST = "FAST",
  CUSTOM = "CUSTOM",
}


export enum ExchangeType {
  SWAP = "SWAP",
  SELL = "SELL",
  FUND = "FUND"
}

export enum ProductType {
  SWAP = "SWAP",
  SELL = "SELL",
  CARD = "CARD"
}

export type GetSwapPayload = typeof retrieveSwapPayload;

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

export type BEData = {
  quoteId: string;
  inAmount: number;
  outAmount: number;
};

export type GetSellPayload = (
  nonce: string,
  sellAddress: string,
  amount: BigNumber
) => Promise<{
  recipientAddress: string;
  amount: BigNumber;
  binaryPayload: string;
  signature: Buffer;
  beData: BEData;
}>;

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

export type ErrorType = 'generic' | 'swap';

/**
 * ExchangeSDK allows you to send a swap request to a Ledger Device through a Ledger Live request.
 * Under the hood, it relies on {@link https://github.com/LedgerHQ/wallet-api WalletAPI}.
 */
export class ExchangeSDK {
  readonly providerId: string;

  private walletAPIDecorator: WalletApiDecorator;
  private transport: WindowMessageTransport | Transport | undefined;
  private logger: Logger = new Logger(true);
  private errorType: ErrorType = 'generic';

  get walletAPI(): WalletAPIClient {
    return this.walletAPIDecorator.walletClient;
  }

  private get exchangeModule(): ExtendedExchangeModule {
    return (this.walletAPI.custom as any).exchange as ExtendedExchangeModule;
  }

  /**
   * @param {string} providerId - Your providerId that Ledger has assigned to you.
   * @param {WindowMessageTransport} [transport]
   * @param {WalletAPIClient} [walletAPI]
   * @param {string} [customUrl] - Backend URL environment
   */
  constructor(
    providerId: string,
    transport?: Transport,
    walletAPI?: WalletAPIClient<typeof getCustomModule>,
    customUrl?: string
  ) {
    this.providerId = providerId;

    if (!walletAPI) {
      if (!transport) {
        const transportInstance = new WindowMessageTransport();
        transportInstance.connect();
        this.transport = transportInstance;
      } else {
        this.transport = transport;
      }

      this.walletAPIDecorator = walletApiDecorator(
        new WalletAPIClient(this.transport, defaultLogger, getCustomModule)
      );
    } else {
      this.walletAPIDecorator = walletApiDecorator(walletAPI);
    }

    if (customUrl) {
      // Set API environment
      setBackendUrl(customUrl);
    }
  }

  private handleError(error: any, step?: StepError) {
    const err = parseError(this.errorType, error, step);
    handleErrors(this.walletAPI, err);
  }

  /**
   * Ask user to validate a swap transaction.
   * @param {SwapInfo} info - Information necessary to create a swap transaction.
   * @return {Promise<{transactionId: string, swapId: string}>} Promise of the hash of the sent transaction.
   * @throws {ExchangeError}
   */
  async swap(info: SwapInfo): Promise<{ transactionId: string, swapId: string }> {
    this.errorType = 'swap';
    this.logger.log("*** Start Swap ***");

    const {
      fromAccountId,
      toAccountId,
      fromAmount,
      feeStrategy,
      customFeeConfig = {},
      quoteId,
      toNewTokenId,
      getSwapPayload,
    } = info;

    const { account: fromAccount, currency: fromCurrency } =
      await this.walletAPIDecorator.retrieveUserAccount(fromAccountId, this.errorType);

    const { account: toAccount } =
      await this.walletAPIDecorator.retrieveUserAccount(toAccountId, this.errorType);

    // Check enough funds
    const fromAmountAtomic = this.convertToAtomicUnit(fromAmount, fromCurrency);
    this.canSpendAmount(fromAccount, fromAmountAtomic);

    // Step 1: Ask for deviceTransactionId
    const { transactionId: deviceTransactionId, device } =
      await this.exchangeModule
        .startSwap({
          exchangeType: ExchangeType.SWAP,
          provider: this.providerId,
          fromAccountId,
          toAccountId,
          tokenCurrency: toNewTokenId || "",
        })
        .catch((error: Error) => {
          const err = parseError(this.errorType, error, StepError.NONCE);
          this.logger.error(err as Error);
          throw err;
        });
    this.logger.debug("DeviceTransactionId retrieved:", deviceTransactionId);

    // Step 2: Ask for payload creation
    const payloadRequest = getSwapPayload ?? retrieveSwapPayload;
    const { binaryPayload, signature, payinAddress, swapId, payinExtraId, extraTransactionParameters } =
      await payloadRequest({
        provider: this.providerId,
        deviceTransactionId,
        fromAccount,
        toAccount,
        toNewTokenId,
        amount: fromAmount,
        amountInAtomicUnit: fromAmountAtomic,
        quoteId,
      }).catch((error: Error) => {
        this.handleError(error, StepError.PAYLOAD);
        throw error;
      });

    // Step 3: Send payload
    const transaction = await this.walletAPIDecorator
      .createTransaction({
        recipient: payinAddress,
        amount: fromAmountAtomic,
        currency: fromCurrency,
        customFeeConfig,
        payinExtraId,
        extraTransactionParameters,
      }, this.errorType)
      .catch(async (error) => {
        await this.cancelSwapOnError(
          error,
          swapId,
          this.getSwapStep(error),
          fromAccount,
          toAccount,
          device?.modelId,
          quoteId ? "fixed" : "float"
        );

        this.handleError(error);
        throw error;
      });
    const transactionId = await this.exchangeModule
      .completeSwap({
        provider: this.providerId,
        fromAccountId,
        toAccountId, // This attribute will point to the parent account when the token is new.
        swapId,
        transaction,
        binaryPayload: binaryPayload as any, // TODO: Fix when customAPI types are fixed
        signature: signature as any, // TODO: Fix when customAPI types are fixed
        feeStrategy,
        tokenCurrency: toNewTokenId,
      })
      .catch(async (error: Error) => {
        await this.cancelSwapOnError(
          error,
          swapId,
          this.getSwapStep(error),
          fromAccount,
          toAccount,
          device?.modelId,
          quoteId ? "fixed" : "float"
        );

        if (error.name === "DisabledTransactionBroadcastError") {
          throw error;
        }

        this.handleError(error, StepError.IGNORED_SIGNATURE);
        throw error;
      });

    this.logger.log("Transaction sent:", transactionId);
    this.logger.log("*** End Swap ***");
    await confirmSwap({
      provider: this.providerId,
      swapId: swapId ?? "",
      transactionId,
      sourceCurrencyId: fromAccount.currency,
      targetCurrencyId: toAccount.currency,
      hardwareWalletType: device?.modelId ?? "",
    }).catch((error: Error) => {
      this.logger.error(error);
      // Do not throw error; let the integrating app know that everything is OK for the swap
    });
    return { transactionId, swapId };
  }

  /**
   * Ask user to validate a sell transaction.
   * @param {SellInfo} info - Information necessary to create a sell transaction.
   * @return {Promise<string | void>} Promise of the hash of the sent transaction.
   * @throws {ExchangeError}
   */
  async sell(info: SellInfo): Promise<string | void> {
    this.errorType = 'generic';
    this.logger.log("*** Start Sell ***");

    const {
      fromAccountId,
      fromAmount,
      feeStrategy = FeeStrategyEnum.MEDIUM,
      customFeeConfig = {},
      quoteId,
      rate,
      toFiat,
      getSellPayload,
      type = ProductType.SELL,
    } = info;

    const { account, currency } =
      await this.walletAPIDecorator.retrieveUserAccount(fromAccountId, this.errorType);

    // Check enough funds
    const initialAtomicAmount = this.convertToAtomicUnit(fromAmount, currency);

    this.canSpendAmount(account, initialAtomicAmount);

    // Step 1: Ask for deviceTransactionId
    const deviceTransactionId = await this.exchangeModule
      .startSell({
        provider: this.providerId,
        //TODO: Pass in fromAccountId (newer version of the exchange module supports this)
      })
      .catch((error: Error) => {
        const err = parseError(this.errorType, error, StepError.NONCE);
        this.logger.error(err as Error);
        throw err;
      })

    this.logger.debug("DeviceTransactionId retrieved:", deviceTransactionId);

    // Step 2: Ask for payload creation
    const { recipientAddress, binaryPayload, signature, amount, beData } =
      await this.sellPayloadRequest({
        quoteId,
        rate,
        toFiat,
        amount: fromAmount,
        getSellPayload,
        account,
        deviceTransactionId,
        initialAtomicAmount,
        type,
      });

    if (getSellPayload) {
      await decodeSellPayloadAndPost(
        binaryPayload as string,
        beData as BEData,
        this.providerId
      );
    }

    const fromAmountAtomic = this.convertToAtomicUnit(amount, currency);
    //TODO: verify that the new amount is the same as initial amount
    this.canSpendAmount(account, fromAmountAtomic);

    this.logger.log("Payload received:", {
      recipientAddress,
      amount: fromAmountAtomic,
      binaryPayload,
      signature,
    });

    // Step 3: Send payload
    const transaction = await this.walletAPIDecorator.createTransaction({
      recipient: recipientAddress,
      amount: fromAmountAtomic,
      currency,
      customFeeConfig,
    }, this.errorType)
      .catch(async (error) => {
        await this.cancelSellOnError({
          error,
          quoteId,
        });

        this.handleError(error);
        throw error;
      });

    const tx = await this.exchangeModule
      .completeSell({
        provider: this.providerId,
        fromAccountId,
        transaction,
        binaryPayload,
        signature,
        feeStrategy,
      })
      .catch(async (error: Error) => {
        await this.cancelSellOnError({
          error,
          quoteId,
        });

        if (error.name === "DisabledTransactionBroadcastError") {
          throw error;
        }

        this.handleError(error, StepError.SIGNATURE);
        throw error;
      });

    this.logger.log("Transaction sent:", tx);
    this.logger.log("*** End Sell ***");
    await confirmSell({
      provider: this.providerId,
      quoteId: quoteId ?? "",
      transactionId: tx,
    }).catch((error: Error) => {
      this.logger.error(error);
    });
    return tx;
  }

  /**
   * Ask user to validate a fund transaction.
   * @param {FundInfo} info - Information necessary to create a fund transaction.
   * @return {Promise<string | void>} Promise of the hash of the sent transaction.
   * @throws {ExchangeError}
   */
  async fund(info: FundInfo): Promise<string | void> {
    this.errorType = "generic";
    this.logger.log("*** Start Fund ***");

    const {
      fromAccountId,
      fromAmount,
      feeStrategy = FeeStrategyEnum.MEDIUM,
      customFeeConfig = {},
      orderId,
      type = ProductType.CARD,
    } = info;

    const { account, currency } =
      await this.walletAPIDecorator.retrieveUserAccount(
        fromAccountId,
        this.errorType
      );

    // Check enough funds
    const fromAmountAtomic = this.convertToAtomicUnit(fromAmount, currency);
    this.canSpendAmount(account, fromAmountAtomic);

    // Step 1: Ask for deviceTransactionId
    const deviceTransactionId = await this.exchangeModule
      //TODO: pass in provider and fromAccountId after updating startFund in LL
      // {provider: this.providerId, fromAccountId}
      .startFund()
      .catch((error: Error) => {
        const err = parseError(this.errorType, error, StepError.NONCE);
        this.logger.error(err as Error);
        throw err;
      });

    this.logger.debug("DeviceTransactionId retrieved:", deviceTransactionId);

    // Step 2: Ask for payload creation
    const { recipientAddress, binaryPayload, signature } =
      await this.fundPayloadRequest({
        orderId,
        amount: fromAmount,
        account,
        deviceTransactionId,
        type,
      });

    this.logger.log("Payload received:", {
      recipientAddress,
      amount: fromAmountAtomic,
      binaryPayload,
      signature,
    });

    // Step 3: Send payload
    const transaction = await this.walletAPIDecorator
      .createTransaction(
        {
          recipient: recipientAddress,
          amount: fromAmountAtomic,
          currency,
          customFeeConfig,
        },
        this.errorType
      )
      .catch(async (error) => {
        await this.cancelFundOnError({
          error,
          orderId,
        });

        this.handleError(error);
        throw error;
      });

    const tx = await this.exchangeModule
      .completeFund({
        provider: this.providerId,
        fromAccountId,
        transaction,
        //TODO: Remove any type cast after updating types for completeFund in LL
        binaryPayload: binaryPayload as any,
        signature: binaryPayload as any,
        feeStrategy,
      })
      .catch(async (error: Error) => {
        await this.cancelFundOnError({
          error,
          orderId,
        });

        if (error.name === "DisabledTransactionBroadcastError") {
          throw error;
        }

        this.handleError(error, StepError.SIGNATURE);
        throw error;
      });

    this.logger.log("Transaction sent:", tx);
    this.logger.log("*** End Fund ***");
    await confirmFund({
      provider: this.providerId,
      orderId: orderId ?? "",
      transactionId: tx,
    }).catch((error: Error) => {
      this.logger.error(error);
    });
    return tx;
  }

  /**
   * Disconnects this instance from the WalletAPI server.
   */
  disconnect() {
    if (this.transport && "disconnect" in this.transport) {
      this.transport.disconnect();
    }
  }

  private canSpendAmount(account: Account, amount: BigNumber): void {
    if (!account.spendableBalance.isGreaterThanOrEqualTo(amount)) {
      const err = parseError(this.errorType, new Error('Not enough funds'), StepError.CHECK_FUNDS);
      this.logger.error(err as Error);
      throw err;
    }
  }

  private convertToAtomicUnit(
    amount: BigNumber,
    currency: Currency
  ): BigNumber {
    const convertedNumber = amount.shiftedBy(currency.decimals);
    if (!convertedNumber.isInteger()) {
      throw new Error("Unable to convert amount to atomic unit");
    }
    return convertedNumber;
  }

  private getSwapStep(error: Error): string {
    if ((error as CompleteExchangeError).step) {
      return (error as CompleteExchangeError).step;
    } else if (error.name === "DisabledTransactionBroadcastError") {
      return "SIGN_COIN_TRANSACTION";
    }

    return "UNKNOWN_STEP";
  }

  private async cancelSwapOnError(
    error: Error,
    swapId: string,
    swapStep: string,
    fromAccount: Account,
    toAccount: Account,
    deviceModelId: string | undefined,
    swapType: string
  ) {
    await cancelSwap({
      provider: this.providerId,
      swapId: swapId ?? "",
      swapStep: swapStep,
      statusCode: error.name,
      errorMessage: error.message,
      sourceCurrencyId: fromAccount.currency,
      targetCurrencyId: toAccount.currency,
      hardwareWalletType: deviceModelId ?? "",
      swapType,
    }).catch((cancelError: Error) => {
      this.logger.error(cancelError);
    });
  }

  private async cancelSellOnError({
    error,
    quoteId,
  }: {
    error: Error;
    quoteId?: string;
  }) {
    await cancelSell({
      provider: this.providerId,
      quoteId: quoteId ?? "",
      statusCode: error.name,
      errorMessage: error.message,
    }).catch((cancelError: Error) => {
      this.logger.error(cancelError);
    });
  }

  private async sellPayloadRequest({
    account,
    getSellPayload,
    quoteId,
    toFiat,
    rate,
    amount,
    deviceTransactionId,
    initialAtomicAmount,
    type,
  }: {
    amount: BigNumber;
    getSellPayload?: GetSellPayload;
    account: Account;
    deviceTransactionId: string;
    initialAtomicAmount: BigNumber;
    quoteId?: string;
    rate?: number;
    toFiat?: string;
    type: ProductType;
  }) {
    let recipientAddress: string;
    let binaryPayload: Buffer | string;
    let signature: Buffer | string;
    let beData: BEData | undefined;
    let newAmount = amount;

    if (getSellPayload) {
      const data = await getSellPayload(
        deviceTransactionId,
        account.address,
        initialAtomicAmount
      ).catch((error: Error) => {
        this.handleError(error, StepError.PAYLOAD);
        throw error;
      });

      recipientAddress = data.recipientAddress;
      newAmount = data.amount;
      binaryPayload = data.binaryPayload;
      signature = Buffer.from(data.signature);
      beData = data.beData;
    } else {
      const data = await retrieveSellPayload({
        quoteId: quoteId!,
        provider: this.providerId,
        fromCurrency: account.currency,
        toCurrency: toFiat!,
        refundAddress: account.address,
        amountFrom: amount.toNumber(),
        amountTo: rate! * amount.toNumber(),
        nonce: deviceTransactionId,
        type,
      }).catch((error: Error) => {
        this.handleError(error, StepError.PAYLOAD);
        throw error;
      });

      recipientAddress = data.payinAddress;
      binaryPayload = data.providerSig.payload;
      signature = data.providerSig.signature;
    }

    return {
      recipientAddress,
      binaryPayload,
      signature,
      amount: newAmount,
      beData,
    };
  }

  private async fundPayloadRequest({
    account,
    orderId,
    amount,
    deviceTransactionId,
    type,
  }: {
    amount: BigNumber;
    account: Account;
    deviceTransactionId: string;
    orderId?: string;
    type: ProductType;
  }) {
    let recipientAddress: string;
    let binaryPayload: Buffer | string;
    let signature: Buffer | string;

    const data = await retrieveFundPayload({
      orderId: orderId!,
      provider: this.providerId,
      fromCurrency: account.currency,
      refundAddress: account.address,
      amountFrom: amount.toNumber(),
      nonce: deviceTransactionId,
      type,
    }).catch((error: Error) => {
      this.handleError(error, StepError.PAYLOAD);
      throw error;
    });

    recipientAddress = data.payinAddress;
    binaryPayload = data.providerSig.payload;
    signature = data.providerSig.signature;

    return {
      recipientAddress,
      binaryPayload,
      signature,
    };
  }

  private async cancelFundOnError({
    error,
    orderId,
  }: {
    error: Error;
    orderId?: string;
  }) {
    await cancelFund({
      provider: this.providerId,
      orderId: orderId ?? "",
      statusCode: error.name,
      errorMessage: error.message,
    }).catch((cancelError: Error) => {
      this.logger.error(cancelError);
    });
  }
}
