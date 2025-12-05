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
  postSellPayload,
  retrieveSellPayload,
  retrieveSwapPayload,
  setBackendUrl,
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
import { TrackingService } from "./services/TrackingService";
import { createBackendService } from "./services/BackendService";
import {
  decodeFundPayload,
  decodeSellPayload,
} from "@ledgerhq/hw-app-exchange";

export type GetSwapPayload = typeof retrieveSwapPayload;

/**
 * ExchangeSDK allows you to send a swap request to a Ledger Device through a Ledger Live request.
 * Under the hood, it relies on {@link https://github.com/LedgerHQ/wallet-api WalletAPI}.
 */
export class ExchangeSDK {
  readonly providerId: string;

  public tracking: TrackingService;
  private backend: ReturnType<typeof createBackendService>;

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
   * @param {"production" | "staging"} [options.environment] - Environment for the Ledger backend services
   * @param {Transport} [options.transport] - Custom transport instance such as wallet-api-simulator transport
   * @param {WalletAPIClient} [options.walletAPI] - Custom WalletAPIClient instance
   * @param {string} [options.customUrl] - Custom backend URL
   * @param {string} [options.providerSessionId] - Provider session ID to be used for tracking
   */
  constructor(
    providerId: string,
    options?: {
      transport?: Transport;
      walletAPI?: WalletAPIClient<typeof getCustomModule>;
      customUrl?: string;
      environment?: "staging" | "preproduction" | "production";
      providerSessionId?: string;
    },
  ) {
    const { transport, walletAPI, customUrl, environment } = options || {};

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

    this.backend = createBackendService(environment || "production", customUrl);
    this.tracking = new TrackingService({
      walletAPI: this.walletAPI,
      providerId: this.providerId,
      environment,
      providerSessionId: options?.providerSessionId,
    });

    this.tracking.trackEvent("exchange_sdk_initialized", {
      providerId: this.providerId,
    });
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
      type = ProductType.SELL,
    } = info;

    //
    // STEP 1 — Retrieve account & check funds
    //
    const { account, currency } =
      await this.walletAPIDecorator.retrieveUserAccount(fromAccountId);

    const initialAtomicAmount = this.convertToAtomicUnit(fromAmount, currency);
    this.canSpendAmount(account, initialAtomicAmount);

    //
    // STEP 2 — Retrieve deviceTransactionId (nonce)
    //
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

    //
    // STEP 3 — Retrieve raw backend payload
    //
    this.isProductTypeSupported(ExchangeType.SELL, type);

    const { payinAddress, providerSig, sellId } = await this.backend.sell
      .retrievePayload({
        quoteId: quoteId!,
        provider: this.providerId,
        fromCurrency: account.currency,
        toCurrency: toFiat!,
        refundAddress: account.address,
        amountFrom: fromAmount.toNumber(),
        amountTo: rate! * fromAmount.toNumber(),
        nonce: deviceTransactionId,
        type,
      })
      .catch((error: Error) => {
        this.handleError({ error, step: StepError.PAYLOAD });
        throw error;
      });

    //
    // STEP 4 — Decode provider payload
    //
    const sellPayload = await decodeSellPayload(
      Buffer.from(providerSig.payload, "base64").toString(),
    ).catch((error: Error) => this.logger.error(error));

    const fromAmountAtomic = this.convertToAtomicUnit(fromAmount, currency);
    this.canSpendAmount(account, fromAmountAtomic);

    this.logger.log("Payload received:", {
      payinAddress,
      providerSig,
      sellId,
      amount: fromAmountAtomic,
    });

    //
    // STEP 5 — Create transaction on device
    //
    const transaction = await this.walletAPIDecorator
      .createTransaction({
        recipient: payinAddress,
        amount: fromAmountAtomic,
        currency,
        customFeeConfig,
        payinExtraId: sellPayload?.inExtraId,
      })
      .catch(async (error) => {
        await this.backend.sell.cancel({
          provider: this.providerId,
          sellId: sellId ?? "",
          statusCode: error.name,
          errorMessage: error.message,
          ledgerSessionId,
        });

        this.handleError({ error });
        throw error;
      });

    //
    // STEP 6 — Ask device to sign and broadcast
    //
    const tx = await this.exchangeModule
      .completeSell({
        provider: this.providerId,
        fromAccountId,
        transaction,
        binaryPayload: providerSig.payload,
        signature: providerSig.signature,
        feeStrategy,
      })
      .catch(async (error: Error) => {
        await this.backend.sell.cancel({
          provider: this.providerId,
          sellId: sellId ?? "",
          statusCode: error.name,
          errorMessage: error.message,
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

    //
    // STEP 7 — Confirm with backend
    //
    await this.backend.sell
      .confirm({
        provider: this.providerId,
        sellId: sellId ?? "",
        transactionId: tx,
        ledgerSessionId,
      })
      .catch((error: Error) => {
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

    //
    // STEP 1 — Retrieve account & check funds
    //
    const { account, currency } =
      await this.walletAPIDecorator.retrieveUserAccount(fromAccountId);

    const fromAmountAtomic = this.convertToAtomicUnit(fromAmount, currency);
    this.canSpendAmount(account, fromAmountAtomic);

    //
    // STEP 2 — Retrieve deviceTransactionId (nonce)
    //
    const deviceTransactionId = await this.exchangeModule
      .startFund({ provider: this.providerId, fromAccountId })
      .catch((error: Error) => {
        throw this.handleError({ error, step: StepError.NONCE });
      });

    this.logger.debug("DeviceTransactionId:", deviceTransactionId);

    //
    // STEP 3 — Retrieve raw backend payload
    //
    this.isProductTypeSupported(ExchangeType.FUND, type);

    const raw = await this.backend.fund
      .retrievePayload({
        quoteId: quoteId!,
        provider: this.providerId,
        fromCurrency: account.currency,
        toCurrency: toCurrency ?? account.currency,
        refundAddress: account.address,
        amountFrom: fromAmount.toNumber(),
        amountTo: toAmount ? toAmount.toNumber() : fromAmount.toNumber(),
        nonce: deviceTransactionId,
        type,
      })
      .catch((error: Error) => {
        this.handleError({ error, step: StepError.PAYLOAD });
        throw error;
      });

    //
    // STEP 4 — Decode provider payload
    //
    const decodedPayload = await decodeFundPayload(
      Buffer.from(raw.providerSig.payload, "base64").toString(),
    ).catch((error: Error) => this.logger.error(error));

    const payload = {
      binaryPayload: raw.providerSig.payload,
      signature: raw.providerSig.signature,
      recipientAddress: raw.payinAddress,
      payinExtraId: decodedPayload?.payinExtraId,
    };

    this.logger.log("Fund SDK Payload:", payload);

    //
    // STEP 5 — Create transaction on device
    //
    const transaction = await this.walletAPIDecorator
      .createTransaction({
        recipient: payload.recipientAddress,
        amount: fromAmountAtomic,
        currency,
        customFeeConfig,
        payinExtraId: payload.payinExtraId,
      })
      .catch(async (error) => {
        await this.backend.fund.cancel({
          provider: this.providerId,
          quoteId: quoteId ?? "",
          statusCode: error.name,
          errorMessage: error.message,
        });
        this.handleError({ error });
        throw error;
      });

    //
    // STEP 6 — Ask device to sign and broadcast
    //
    const tx = await this.exchangeModule
      .completeFund({
        provider: this.providerId,
        fromAccountId,
        transaction,
        binaryPayload: payload.binaryPayload,
        signature: payload.signature,
        feeStrategy,
      })
      .catch(async (error: Error) => {
        await this.backend.fund.cancel({
          provider: this.providerId,
          quoteId: quoteId ?? "",
          statusCode: error.name,
          errorMessage: error.message,
        });

        if (error.name === "DisabledTransactionBroadcastError") {
          throw error;
        }

        this.handleError({ error, step: StepError.SIGNATURE });
        throw error;
      });

    this.logger.log("Fund transaction completed:", tx);

    //
    // STEP 7 — Confirm with backend
    //
    await this.backend.fund
      .confirm({
        provider: this.providerId,
        quoteId: quoteId ?? "",
        transactionId: tx,
      })
      .catch((error: Error) => this.logger.error(error));

    this.logger.log("*** End Fund ***");

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
      parentAccountId: string | undefined;
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
        parentAccountId: account.parentAccountId,
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
