import {
  Account,
  Currency,
  Transport,
  WalletAPIClient,
  WindowMessageTransport,
  defaultLogger,
} from "@ledgerhq/wallet-api-client";
import BigNumber from "bignumber.js";
import {
  NonceStepError,
  NotEnoughFunds,
  PayloadStepError,
  CancelStepError,
  ConfirmStepError,
  SignatureStepError,
  CompleteExchangeError,
} from "./error";
import { Logger } from "./log";
import { cancelSwap, confirmSwap, retrievePayload, setBackendUrl } from "./api";
import { handleErrors } from "./handleErrors";
import walletApiDecorator, {
  type WalletApiDecorator,
  getCustomModule,
} from "./wallet-api";
import { ExchangeModule } from "@ledgerhq/wallet-api-exchange-module";

export type GetSwapPayload = typeof retrievePayload;
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
  getSwapPayload?: GetSwapPayload;
};

/**
 * Sell lambda call during sell process.
 * @param {nonce}
 * @param {sellAddress}
 * @param {amount} amount choosen by User, but in lowest atomic unit (ex: Satoshi, Wei)
 */
export type GetSellPayload = (
  nonce: string,
  sellAddress: string,
  amount: bigint,
) => Promise<{
  recipientAddress: string;
  amount: bigint;
  binaryPayload: Buffer;
  signature: Buffer;
}>;
/**
 * Sell information required to request user's a sell transaction.
 */
export type SellInfo = {
  quoteId?: string;
  accountId: string;
  amount: BigNumber;
  feeStrategy: FeeStrategy;
  customFeeConfig?: {
    [key: string]: BigNumber;
  };
  getSellPayload: GetSellPayload;
};

export type FeeStrategy = "SLOW" | "MEDIUM" | "FAST" | "CUSTOM";

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

  private walletAPIDecorator: WalletApiDecorator;
  private transport: WindowMessageTransport | Transport | undefined;
  private logger: Logger = new Logger(true);

  get walletAPI(): WalletAPIClient {
    return this.walletAPIDecorator.walletClient;
  }

  private get exchangeModule(): ExchangeModule {
    return (this.walletAPI.custom as any).exchange as ExchangeModule;
  }

  /**
   *
   * @param {string} providerId - Your providerId that Ledger has assign you.
   * @param {WindowMessageTransport} transport
   * @param {WalletAPIClient} walletAPI
   * @param {string} customUrl - Backend url environment
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
        const transport = new WindowMessageTransport();
        transport.connect();
        this.transport = transport;
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

  private handleError = (error: any) => {
    handleErrors(this.walletAPI, error);
  };

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
      quoteId,
      toNewTokenId,
      getSwapPayload,
    } = info;
    const { account: fromAccount, currency: fromCurrency } =
      await this.walletAPIDecorator
        .retrieveUserAccount(fromAccountId)
        .catch((error: Error) => {
          throw error;
        });
    const { account: toAccount } = await this.walletAPIDecorator
      .retrieveUserAccount(toAccountId)
      .catch((error: Error) => {
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

    // 2 - Ask for payload creation
    const payloadRequest =
      getSwapPayload !== undefined ? getSwapPayload : retrievePayload;
    const { binaryPayload, signature, payinAddress, swapId, payinExtraId } =
      await payloadRequest({
        provider: this.providerId,
        deviceTransactionId,
        fromAccount: fromAccount,
        toAccount: toAccount,
        toNewTokenId,
        amount: fromAmount,
        amountInAtomicUnit: fromAmountAtomic,
        quoteId,
      }).catch((error: Error) => {
        const err = new PayloadStepError(error);
        this.handleError(err);
        this.logger.error(err);
        throw err;
      });

    // 3 - Send payload
    const transaction = await this.walletAPIDecorator.createTransaction({
      recipient: payinAddress,
      amount: fromAmountAtomic,
      currency: fromCurrency,
      customFeeConfig,
      payinExtraId,
    });

    const tx = await this.exchangeModule
      .completeSwap({
        provider: this.providerId,
        fromAccountId,
        toAccountId, // this attribute will point the parent account when the token is new.
        swapId,
        transaction,
        binaryPayload: binaryPayload as any, // TODO fix later when customAPI types are fixed
        signature: signature as any, // TODO fix later when customAPI types are fixed
        feeStrategy,
        tokenCurrency: toNewTokenId,
      })
      .catch(async (error: Error) => {
        await cancelSwap({
          provider: this.providerId,
          swapId: swapId ?? "",
          ...((error as CompleteExchangeError).step
            ? { swapStep: (error as CompleteExchangeError).step }
            : {}),
          statusCode: error.name,
          errorMessage: error.message,
          sourceCurrencyId: fromAccount.currency,
          targetCurrencyId: toAccount.currency,
          hardwareWalletType: device?.modelId ?? "",
          swapType: quoteId ? "fixed" : "float",
        }).catch(async (error: Error) => {
          const err = new CancelStepError(error);
          this.handleError(err);
          this.logger.error(err);
          throw error; //throw orignal error for dev
        });

        // defined in https://github.com/LedgerHQ/ledger-live/blob/develop/libs/ledgerjs/packages/errors/src/index.ts
        // used for development
        if (error.name === "DisabledTransactionBroadcastError") {
          throw error;
        }

        const err = new SignatureStepError(error);
        this.handleError(err);
        this.logger.error(err);
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
    }).catch(async (error: Error) => {
      const err = new ConfirmStepError(error);
      this.handleError(err);
      this.logger.error(err);
      // do not throw error, let the integrating app everything is OK for the swap
    });
    return tx;
  }

  /**
   * Ask user to validate a sell transaction.
   * @param {SellInfo} info - Information necessary to create a sell transaction {@see SellInfo}.
   * @return {Promise} Promise of hash of send transaction.
   * @throws {ExchangeError}
   */
  async sell(info: SellInfo): Promise<string | void> {
    this.logger.log("*** Start Sell ***");

    const {
      accountId,
      amount: fromAmount,
      feeStrategy,
      customFeeConfig = {},
      getSellPayload,
    } = info;

    const { account, currency } = await this.walletAPIDecorator
      .retrieveUserAccount(accountId)
      .catch((error: Error) => {
        throw error;
      });

    // Check enough fund
    const fromAmountAtomic = convertToAtomicUnit(fromAmount, currency);
    if (canSpendAmount(account, fromAmountAtomic) === false) {
      const err = new NotEnoughFunds();
      this.logger.error(err);
      throw err;
    }

    // 1 - Ask for deviceTransactionId
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

    // 2 - Ask for payload creation
    this.logger.log("Call getSellDestinationAccount");
    const { recipientAddress, amount, binaryPayload, signature } =
      await getSellPayload(
        deviceTransactionId,
        account.address,
        BigInt(fromAmountAtomic.toString()),
      );
    this.logger.log("Payload received:", {
      recipientAddress,
      amount,
      binaryPayload,
      signature,
    });

    // 3 - Send payload
    const transaction = await this.walletAPIDecorator.createTransaction({
      recipient: recipientAddress,
      amount,
      currency,
      customFeeConfig,
    });

    const tx = await this.exchangeModule
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
    if (this.transport && "disconnect" in this.transport) {
      this.transport.disconnect();
    }
  }
}

function canSpendAmount(account: Account, amount: bigint): boolean {
  return account.spendableBalance.isGreaterThanOrEqualTo(
    new BigNumber(amount.toString()),
  );
}

function convertToAtomicUnit(amount: BigNumber, currency: Currency): bigint {
  const convertedNumber = amount.shiftedBy(currency.decimals);
  if (!convertedNumber.isInteger()) {
    throw new Error("Unable to convert amount to atomic unit");
  }
  return BigInt(convertedNumber.toString());
}
