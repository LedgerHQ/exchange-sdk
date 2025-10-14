import BigNumber from "bignumber.js";
import {
  Account,
  Currency,
  MessageSign,
  Transport,
  WalletAPIClient,
  WindowMessageTransport,
  defaultLogger,
} from "@ledgerhq/wallet-api-client";
import {
  cancelSwap,
  confirmSwap,
  cancelSell,
  confirmSell,
  decodeBinarySellPayload,
  decodeBinaryFundPayload,
  postSellPayload,
  retrieveSellPayload,
  retrieveSwapPayload,
  setBackendUrl,
  retrieveFundPayload,
  cancelFund,
  confirmFund,
  cancelTokenApproval,
  confirmTokenApproval,
  supportedProductsByExchangeType,
} from "./api";
import { CompleteExchangeError } from "./error/SwapError";
import { handleErrors } from "./error/handleErrors";
import { Logger } from "./log";
import walletApiDecorator, {
  CustomMethods,
  getCustomModule,
} from "./wallet-api";
import {
  CustomErrorType,
  ParseError,
  parseError,
  StepError,
} from "./error/parser";
import {
  ExchangeType,
  FeeStrategyEnum,
  FundInfo,
  GetSellPayload,
  ProductType,
  SellInfo,
  SwapInfo,
  TokenApprovalInfo,
} from "./sdk.types";
import { WalletApiDecorator } from "./wallet-api.types";
import { ExchangeModule } from "@ledgerhq/wallet-api-exchange-module";

export type GetSwapPayload = typeof retrieveSwapPayload;

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

  private get exchangeModule(): ExchangeModule {
    return (this.walletAPI.custom as any).exchange as ExchangeModule;
  }

  private get customMethods(): CustomMethods {
    return (this.walletAPI.custom as any).customMethods as CustomMethods;
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
    customUrl?: string,
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
        new WalletAPIClient(this.transport, defaultLogger, getCustomModule),
      );
    } else {
      this.walletAPIDecorator = walletApiDecorator(walletAPI);
    }

    if (customUrl) {
      // Set API environment
      setBackendUrl(customUrl);
    }
  }

  private handleError({ error, step, customErrorType }: ParseError) {
    const err = parseError({ error, step, customErrorType });
    handleErrors(this.walletAPI, err);
  }

  /**
   * Ask user to validate a swap transaction.
   * @param {SwapInfo} info - Information necessary to create a swap transaction.
   * @return {Promise<{transactionId: string, swapId: string}>} Promise of the hash of the sent transaction.
   * @throws {ExchangeError}
   */
  async swap(
    info: SwapInfo,
  ): Promise<{ transactionId: string; swapId: string }> {
    this.logger.log("*** Start Swap ***");

    const {
      fromAccountId,
      toAccountId,
      fromAmount,
      feeStrategy,
      customFeeConfig = {},
      quoteId,
      toNewTokenId,
      swapAppVersion,
      getSwapPayload,
    } = info;

    const { account: fromAccount, currency: fromCurrency } =
      await this.walletAPIDecorator.retrieveUserAccount(
        fromAccountId,
        CustomErrorType.SWAP,
      );

    const { account: toAccount } =
      await this.walletAPIDecorator.retrieveUserAccount(
        toAccountId,
        CustomErrorType.SWAP,
      );

    // Check enough funds
    const fromAmountAtomic = this.convertToAtomicUnit(fromAmount, fromCurrency);
    this.canSpendAmount(fromAccount, fromAmountAtomic, CustomErrorType.SWAP);

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
          const err = parseError({
            error,
            step: StepError.NONCE,
            customErrorType: CustomErrorType.SWAP,
          });
          this.logger.error(err as Error);
          throw err;
        });
    this.logger.debug("DeviceTransactionId retrieved:", deviceTransactionId);

    // Step 2: Ask for payload creation
    const payloadRequest = getSwapPayload ?? retrieveSwapPayload;
    const {
      binaryPayload,
      signature,
      payinAddress,
      swapId,
      payinExtraId,
      extraTransactionParameters,
    } = await payloadRequest({
      provider: this.providerId,
      deviceTransactionId,
      fromAccount,
      toAccount,
      toNewTokenId,
      amount: fromAmount,
      amountInAtomicUnit: fromAmountAtomic,
      quoteId,
    }).catch((error: Error) => {
      this.handleError({
        error,
        step: StepError.PAYLOAD,
        customErrorType: CustomErrorType.SWAP,
      });
      throw error;
    });

    // Step 3: Send payload
    const transaction = await this.walletAPIDecorator
      .createTransaction(
        {
          recipient: payinAddress,
          amount: fromAmountAtomic,
          currency: fromCurrency,
          customFeeConfig,
          payinExtraId,
          extraTransactionParameters,
        },
        CustomErrorType.SWAP,
      )
      .catch(async (error) => {
        await this.cancelSwapOnError(
          error,
          swapId,
          this.getSwapStep(error),
          fromAccount,
          toAccount,
          device?.modelId,
          quoteId ? "fixed" : "float",
          swapAppVersion,
        );

        this.handleError({ error });
        throw error;
      });
    const transactionId = await this.exchangeModule
      .completeSwap({
        provider: this.providerId,
        fromAccountId,
        toAccountId, // This attribute will point to the parent account when the token is new.
        swapId,
        transaction,
        binaryPayload,
        signature,
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
          quoteId ? "fixed" : "float",
        );

        if (error.name === "DisabledTransactionBroadcastError") {
          throw error;
        }

        this.handleError({
          error,
          step: StepError.IGNORED_SIGNATURE,
          customErrorType: CustomErrorType.SWAP,
        });
        throw error;
      });

    this.logger.log("Transaction sent:", transactionId);
    this.logger.log("*** End Swap ***");
    await confirmSwap(
      {
        provider: this.providerId,
        swapId: swapId ?? "",
        transactionId,
        sourceCurrencyId: fromAccount.currency,
        targetCurrencyId: toAccount.currency,
        hardwareWalletType: device?.modelId ?? "",
      },
      swapAppVersion,
    ).catch((error: Error) => {
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
    this.logger.log("*** Start Sell ***");
    let { quoteId } = info;

    const {
      fromAccountId,
      fromAmount,
      feeStrategy = FeeStrategyEnum.MEDIUM,
      customFeeConfig = {},
      rate,
      toFiat,
      ledgerSessionId,
      getSellPayload,
      type = ProductType.SELL,
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
        fromAccountId,
      })
      .catch((error: Error) => {
        const err = parseError({ error, step: StepError.NONCE });
        this.logger.error(err as Error);
        throw err;
      });

    this.logger.debug("DeviceTransactionId retrieved:", deviceTransactionId);

    // Step 2: Ask for payload creation
    this.isProductTypeSupported(ExchangeType.SELL, type);

    const {
      recipientAddress,
      binaryPayload,
      signature,
      amount,
      sellId: payloadSellId,
    } = await this.sellPayloadRequest({
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
    let sellId = payloadSellId;

    const sellPayload = await decodeBinarySellPayload(binaryPayload as Buffer);

    if (getSellPayload && sellPayload) {
      const newQuoteId = await postSellPayload(sellPayload, this.providerId);
      //if provider does not provide as quoteId, use the one from the request(generated by out backend)
      if (!quoteId) {
        quoteId = newQuoteId;
        sellId = newQuoteId;
      }
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
    const transaction = await this.walletAPIDecorator
      .createTransaction({
        recipient: recipientAddress,
        amount: fromAmountAtomic,
        currency,
        customFeeConfig,
        payinExtraId: sellPayload?.payinExtraId,
      })
      .catch(async (error) => {
        await this.cancelSellOnError({
          error,
          sellId,
          ledgerSessionId,
        });

        this.handleError({ error });
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
          sellId,
          ledgerSessionId,
        });

        if (error.name === "DisabledTransactionBroadcastError") {
          throw error;
        }

        this.handleError({ error, step: StepError.SIGNATURE });
        throw error;
      });

    this.logger.log("Transaction sent:", tx);
    this.logger.log("*** End Sell ***");
    await confirmSell({
      provider: this.providerId,
      sellId: sellId ?? "",
      transactionId: tx,
      ledgerSessionId,
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
    this.logger.log("*** Start Fund ***");

    const {
      fromAccountId,
      fromAmount,
      feeStrategy = FeeStrategyEnum.MEDIUM,
      customFeeConfig = {},
      quoteId,
      type = ProductType.CARD,
      toAmount,
      toCurrency,
    } = info;

    const { account, currency } =
      await this.walletAPIDecorator.retrieveUserAccount(fromAccountId);

    // Check enough funds
    const fromAmountAtomic = this.convertToAtomicUnit(fromAmount, currency);
    this.canSpendAmount(account, fromAmountAtomic);

    // Step 1: Ask for deviceTransactionId
    const deviceTransactionId = await this.exchangeModule
      .startFund({ provider: this.providerId, fromAccountId })
      .catch((error: Error) => {
        const err = parseError({ error, step: StepError.NONCE });
        this.logger.error(err as Error);
        throw err;
      });

    this.logger.debug("DeviceTransactionId retrieved:", deviceTransactionId);

    // Step 2: Ask for payload creation
    this.isProductTypeSupported(ExchangeType.FUND, type);

    const { recipientAddress, binaryPayload, signature } =
      await this.fundPayloadRequest({
        quoteId,
        amountFrom: fromAmount.toNumber(),
        amountTo: toAmount?.toNumber(),
        account,
        deviceTransactionId,
        type,
        toCurrency,
      });

    this.logger.log("Payload received:", {
      recipientAddress,
      amount: fromAmountAtomic,
      binaryPayload,
      signature,
    });

    // Step 3: Send payload
    const fundPayload = await decodeBinaryFundPayload(binaryPayload as Buffer);
    const transaction = await this.walletAPIDecorator
      .createTransaction({
        recipient: recipientAddress,
        amount: fromAmountAtomic,
        currency,
        customFeeConfig,
        payinExtraId: fundPayload?.payinExtraId,
      })
      .catch(async (error) => {
        await this.cancelFundOnError({
          error,
          quoteId,
        });

        this.handleError({ error });
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
          quoteId,
        });

        if (error.name === "DisabledTransactionBroadcastError") {
          throw error;
        }

        this.handleError({ error, step: StepError.SIGNATURE });
        throw error;
      });

    this.logger.log("Transaction sent:", tx);
    this.logger.log("*** End Fund ***");
    await confirmFund({
      provider: this.providerId,
      quoteId: quoteId ?? "",
      transactionId: tx,
    }).catch((error: Error) => {
      this.logger.error(error);
    });
    return tx;
  }
  /*
   * Ask for token approval
   * @param {TokenApprovalInfo} info - Information necessary to create a token approval transaction.
   * @return {Promise<string | void>} Promise of the hash of the sent transaction.
   * @throws {ExchangeError}
   */
  async tokenApproval(info: TokenApprovalInfo): Promise<string | void> {
    this.logger.log("*** Start Token Approval ***");

    const { orderId, userAccountId, smartContractAddress, approval, rawTx } =
      info;

    this.logger.log("Payload received from partner:", {
      smartContractAddress,
      amount: approval.amount,
      rawTx,
    });

    // Step 1: Validations
    const { account, currency } =
      await this.walletAPIDecorator.retrieveUserAccount(userAccountId);
    const amount = approval.amount || BigNumber(0);
    const fromAmountAtomic = this.convertToAtomicUnit(amount, currency);
    const dataAsBuffer = Buffer.from(rawTx.replace("0x", ""), "hex");

    this.isSupportedToken(currency);

    /**
     * Hardcoding to etherium for now. In the future if we need to support different families the expexted payloads
     * can be different and can be found here https://github.com/LedgerHQ/wallet-api/blob/e81e17f1a1e0d03aadc8224fa0be6e42340c150d/packages/core/src/families/types.ts#L71
     */
    const tx = await this.walletAPI.transaction
      .signAndBroadcast(account.parentAccountId!, {
        amount: fromAmountAtomic,
        family: "ethereum",
        recipient: smartContractAddress,
        nonce: -1,
        data: dataAsBuffer,
      })
      .catch(async (error: Error) => {
        await this.cancelTokenApprovalOnError({
          error,
          orderId,
        });

        if (error.name === "DisabledTransactionBroadcastError") {
          throw error;
        }

        this.handleError({ error, step: StepError.SIGNATURE });
        throw error;
      });

    this.logger.log("Transaction sent:", tx);
    this.logger.log("*** End Token Approval ***");

    await confirmTokenApproval({
      provider: this.providerId,
      orderId: orderId ?? "",
      transactionId: tx,
    }).catch((error: Error) => {
      this.logger.error(error);
    });

    return tx;
  }

  async requestAndSignForAccount({
    message,
    options,
    meta,
    currencyIds,
  }: {
    message: Buffer;
    currencyIds: string[];
    options?: MessageSign["params"]["options"];
    meta?: Record<string, unknown>;
  }): Promise<{
    account: {
      id: string;
      name: string;
    };
    message: Buffer;
  }> {
    this.logger.log("*** Start Request and Sign for Account ***");

    const account = await this.walletAPI.account
      .request({
        currencyIds,
      })
      .catch(async (error: Error) => {
        this.handleError({ error, step: StepError.REQUEST_ACCOUNT });
        throw error;
      });

    const accountId = account.parentAccountId ?? account.id;

    const returnedMessage = await this.walletAPI.message
      .sign(accountId, message, options, meta)
      .catch(async (error: Error) => {
        this.logger.log("*** Sign Unsuccessful ***");
        this.handleError({ error, step: StepError.SIGN });
        throw error;
      });

    return {
      account: {
        id: account.id,
        name: account.name,
      },
      message: returnedMessage,
    };
  }

  closeLiveApp() {
    this.logger.log("*** Close Live App ***");
    this.customMethods.closeLiveApp();
  }

  /**
   * Disconnects this instance from the WalletAPI server.
   */
  disconnect() {
    if (this.transport && "disconnect" in this.transport) {
      this.transport.disconnect();
    }
  }

  private canSpendAmount(
    account: Account,
    amount: BigNumber,
    customErrorType?: CustomErrorType,
  ): void {
    if (!account.spendableBalance.isGreaterThanOrEqualTo(amount)) {
      const err = parseError({
        error: new Error("Not enough funds"),
        step: StepError.CHECK_FUNDS,
        customErrorType,
      });
      this.logger.error(err as Error);
      throw err;
    }
  }

  /**
   * Check if product type is supported by the exchange type based on available BE endpoints
   */
  private isProductTypeSupported(
    exchangeType: ExchangeType,
    productType: ProductType,
    customErrorType?: CustomErrorType,
  ): void {
    if (!supportedProductsByExchangeType[exchangeType][productType]) {
      const err = parseError({
        error: new Error("Product not supported"),
        step: StepError.PRODUCT_SUPPORT,
        customErrorType,
      });
      this.logger.error(err as Error);
      throw err;
    }
  }

  /**
   * Check supported token
   */
  private isSupportedToken(currency: Currency): void {
    if (currency.type === "TokenCurrency" && currency.parent === "base") {
      return;
    }

    const err = parseError({
      error: new Error("Currency not supported"),
      step: StepError.UNSUPPORTED_TOKEN,
    });
    this.logger.error(err as Error);
    throw err;
  }

  private convertToAtomicUnit(
    amount: BigNumber,
    currency: Currency,
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
    swapType: string,
    swapAppVersion?: string,
  ) {
    await cancelSwap(
      {
        provider: this.providerId,
        swapId: swapId ?? "",
        swapStep: swapStep,
        statusCode: error.name,
        errorMessage: error.message,
        sourceCurrencyId: fromAccount.currency,
        targetCurrencyId: toAccount.currency,
        hardwareWalletType: deviceModelId ?? "",
        swapType,
      },
      swapAppVersion,
    ).catch((cancelError: Error) => {
      this.logger.error(cancelError);
    });
  }

  private async cancelSellOnError({
    error,
    sellId,
    ledgerSessionId,
  }: {
    error: Error;
    sellId?: string;
    ledgerSessionId?: string;
  }) {
    await cancelSell({
      provider: this.providerId,
      sellId: sellId ?? "",
      statusCode: error.name,
      errorMessage: error.message,
      ledgerSessionId,
    }).catch((cancelError: Error) => {
      this.logger.error(cancelError);
    });
  }

  /**
   * Request that our BE speaks to the provider BE to retrieve the payload that will
   * ultimately be used to create the transaction on the device
   * @param param0
   * @returns
   */
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
    let newAmount = amount;
    let sellId = "";

    if (getSellPayload) {
      const data = await getSellPayload(
        deviceTransactionId,
        account.address,
        initialAtomicAmount,
      ).catch((error: Error) => {
        this.handleError({ error, step: StepError.PAYLOAD });
        throw error;
      });

      recipientAddress = data.recipientAddress;
      newAmount = data.amount;
      binaryPayload = Buffer.from(data.binaryPayload);
      signature = Buffer.from(data.signature);
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
        this.handleError({ error, step: StepError.PAYLOAD });
        throw error;
      });

      recipientAddress = data.payinAddress;
      binaryPayload = data.providerSig.payload;
      signature = data.providerSig.signature;
      sellId = data.sellId;
    }

    return {
      recipientAddress,
      binaryPayload,
      signature,
      amount: newAmount,
      sellId,
    };
  }

  private async fundPayloadRequest({
    account,
    quoteId,
    amountFrom,
    amountTo,
    deviceTransactionId,
    type,
    toCurrency,
  }: {
    amountFrom: number;
    account: Account;
    deviceTransactionId: string;
    quoteId?: string;
    type: ProductType;
    amountTo?: number;
    toCurrency?: string;
  }) {
    const data = await retrieveFundPayload({
      quoteId: quoteId!,
      amountFrom,
      amountTo: amountTo ?? amountFrom,
      provider: this.providerId,
      fromCurrency: account.currency,
      toCurrency: toCurrency ?? account.currency,
      refundAddress: account.address,
      nonce: deviceTransactionId,
      type,
    }).catch((error: Error) => {
      this.handleError({ error, step: StepError.PAYLOAD });
      throw error;
    });

    const recipientAddress: string = data.payinAddress;
    const binaryPayload: Buffer | string = Buffer.from(
      data.providerSig.payload,
    );
    const signature: Buffer | string = Buffer.from(data.providerSig.signature);

    return {
      recipientAddress,
      binaryPayload,
      signature,
    };
  }

  private async cancelFundOnError({
    error,
    quoteId,
  }: {
    error: Error;
    quoteId?: string;
  }) {
    await cancelFund({
      provider: this.providerId,
      quoteId: quoteId ?? "",
      statusCode: error.name,
      errorMessage: error.message,
    }).catch((cancelError: Error) => {
      this.logger.error(cancelError);
    });
  }

  private async cancelTokenApprovalOnError({
    error,
    orderId,
  }: {
    error: Error;
    orderId?: string;
  }) {
    await cancelTokenApproval({
      provider: this.providerId,
      orderId: orderId ?? "",
      statusCode: error.name,
      errorMessage: error.message,
    }).catch((cancelError: Error) => {
      this.logger.error(cancelError);
    });
  }
}
