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
import { ExchangeCompleteParams, ExchangeModule } from "@ledgerhq/wallet-api-exchange-module";

import {
  cancelSwap,
  confirmSwap,
  cancelSell,
  confirmSell,
  decodeSellPayloadAndPost,
  retrieveSellPayload,
  retrieveSwapPayload,
  setBackendUrl,
} from "./api";
import {
  CompleteExchangeError,
  NonceStepError,
  NotEnoughFunds,
  PayloadStepError,
  SignatureStepError,
} from "./error";
import { handleErrors } from "./handleErrors";
import { Logger } from "./log";
import walletApiDecorator, {
  type WalletApiDecorator,
  getCustomModule,
} from "./wallet-api";

export type FeeStrategy = "SLOW" | "MEDIUM" | "FAST" | "CUSTOM";

enum FeeStrategyEnum {
  SLOW = "SLOW",
  MEDIUM = "MEDIUM",
  FAST = "FAST",
  CUSTOM = "CUSTOM",
}

export const ExchangeType = {
  FUND: "FUND",
  SELL: "SELL",
  SWAP: "SWAP",
  CARD: "CARD"
} as const;

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
  type?: string;
};

// extented type to include paramas as string for binaryPayload and signature
export type ExtendedExchangeModule = ExchangeModule & {
  completeSell: (params: {
    provider: string;
    fromAccountId: string;
    transaction: Transaction;
    binaryPayload: Buffer | string;
    signature: Buffer | string;  // Custom update to accept Buffer or string
    feeStrategy: ExchangeCompleteParams["feeStrategy"];
  }) => Promise<string>;
};

/**
 * ExchangeSDK allows you to send a swap request to a Ledger Device through a Ledger Live request.
 * Under the hood, it relies on {@link https://github.com/LedgerHQ/wallet-api WalletAPI}.
 */
export class ExchangeSDK {
  readonly providerId: string;

  private walletAPIDecorator: WalletApiDecorator;
  private transport: WindowMessageTransport | Transport | undefined;
  private logger: Logger = new Logger(true);

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

  private handleError(error: any) {
    handleErrors(this.walletAPI, error);
  }

  /**
   * Ask user to validate a swap transaction.
   * @param {SwapInfo} info - Information necessary to create a swap transaction.
   * @return {Promise<string | void>} Promise of the hash of the sent transaction.
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
      quoteId,
      toNewTokenId,
      getSwapPayload,
    } = info;

    const { account: fromAccount, currency: fromCurrency } =
      await this.walletAPIDecorator.retrieveUserAccount(fromAccountId);

    const { account: toAccount } =
      await this.walletAPIDecorator.retrieveUserAccount(toAccountId);

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
          const err = new NonceStepError(error);
          this.logger.error(err);
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
        const err = new PayloadStepError(error);
        this.handleError(err);
        throw err;
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
      })
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
    const tx = await this.exchangeModule
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

        const err = new SignatureStepError(error);
        this.handleError(err);
        throw err;
      });

    this.logger.log("Transaction sent:", tx);
    this.logger.log("*** End Swap ***");
    await confirmSwap({
      provider: this.providerId,
      swapId: swapId ?? "",
      transactionId: tx,
      sourceCurrencyId: fromAccount.currency,
      targetCurrencyId: toAccount.currency,
      hardwareWalletType: device?.modelId ?? "",
    }).catch((error: Error) => {
      this.logger.error(error);
      // Do not throw error; let the integrating app know that everything is OK for the swap
    });
    return tx;
  }

  /**
   * Ask user to validate a sell transaction.
   * @param {SellInfo} info - Information necessary to create a sell transaction.
   * @return {Promise<string | void>} Promise of the hash of the sent transaction.
   * @throws {ExchangeError}
   */
  async sell(info: SellInfo): Promise<string | void> {
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
      type = ExchangeType.SELL
    } = info;

    const { account, currency } =
      await this.walletAPIDecorator.retrieveUserAccount(fromAccountId);

    // Check enough funds
    const initialAtomicAmount = this.convertToAtomicUnit(fromAmount, currency);
    this.canSpendAmount(account, initialAtomicAmount);

    // Step 1: Ask for deviceTransactionId
    const deviceTransactionId = await this.exchangeModule
      .startSell({
        provider: this.providerId,
      })
      .catch((error: Error) => {
        const err = new NonceStepError(error);
        this.logger.error(err);
        throw err;
      });
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
        type
      });

    if (getSellPayload) {
      await decodeSellPayloadAndPost(
        binaryPayload as string,
        beData as BEData,
        this.providerId
      );
    }

    const fromAmountAtomic = this.convertToAtomicUnit(amount, currency);
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
    })
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
      .catch(async(error: Error) => {
        await this.cancelSellOnError({
          error,
          quoteId,
        });

        if (error.name === "DisabledTransactionBroadcastError") {
          throw error;
        }

        const err = new SignatureStepError(error);
        this.handleError(err);
        throw err;
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
   * Disconnects this instance from the WalletAPI server.
   */
  disconnect() {
    if (this.transport && "disconnect" in this.transport) {
      this.transport.disconnect();
    }
  }

  private canSpendAmount(account: Account, amount: BigNumber): void {
    if (!account.spendableBalance.isGreaterThanOrEqualTo(amount)) {
      const err = new NotEnoughFunds();
      this.logger.error(err);
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
    error: Error,
    quoteId?: string,
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
    type: string;
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
        const err = new PayloadStepError(error);
        this.handleError(err);
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
        const err = new PayloadStepError(error);
        this.handleError(err);
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
}
