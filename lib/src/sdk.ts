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
// import { decodePayloadProtobuf } from "@ledgerhq/hw-app-exchange";
var protobuf = require("protobufjs");
// var protoJson = require("./test.json");
import * as protoJson from "./test.json";

type SwapProtobufPayload = {
  payinAddress: string;
  payinExtraId?: string;
  refundAddress: string;
  refundExtraId?: string;
  payoutAddress: string;
  payoutExtraId?: string;
  currencyFrom: string;
  currencyTo: string;
  amountToProvider: Buffer;
  amountToWallet: Buffer;
  message?: string;
  deviceTransactionId?: string;
  deviceTransactionIdNg?: Buffer;
};

export type SwapPayload = {
  payinAddress: string;
  payinExtraId?: string;
  refundAddress: string;
  refundExtraId?: string;
  payoutAddress: string;
  payoutExtraId?: string;
  currencyFrom: string;
  currencyTo: string;
  amountToProvider: bigint;
  amountToWallet: bigint;
  message?: string;
  deviceTransactionId?: string;
  deviceTransactionIdNg?: string;
};

function isHexadecimal(str: string): boolean {
  return /^[A-F0-9]+$/i.test(str);
}

// export async function

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
  amount: bigint
) => Promise<{
  recipientAddress: string;
  amount: BigNumber;
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
    customUrl?: string
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

  private handleError = (error: any) => {
    handleErrors(this.walletAPI, error);
  };

  private async decodePayloadProtobuf(payload: string): Promise<SwapPayload> {
    const buffer = isHexadecimal(payload)
      ? Buffer.from(payload, "hex")
      : Buffer.from(payload, "base64");

    const root: { [key: string]: any } =
      protobuf.Root.fromJSON(protoJson) || {};

    this.logger.log("root", root);
    const TransactionResponse = root?.nested.ledger_swap?.NewSellResponse;
    const err = TransactionResponse.verify(buffer);
    this.logger.log("Txres", TransactionResponse);
    this.logger.log("verify", err);
    if (err) {
      this.logger.log("errors in decode", err);
      throw Error(err);
    }
    const decodePayload = TransactionResponse.decode(
      buffer
    ) as unknown as SwapProtobufPayload;

    this.logger.log("decodePayload", decodePayload);

    const {
      amountToWallet: amountToWalletBuffer,
      amountToProvider: amountToProviderBuffer,
      deviceTransactionIdNg: deviceTransactionIdNgBuffer,
    } = decodePayload;
    const amountToWalletHexString =
      Buffer.from(amountToWalletBuffer).toString("hex"); // Gets the hexadecimal representation from the Buffer
    const amountToWallet = BigInt("0x" + amountToWalletHexString); // Convert hexadecimal representation to a big integer

    const amountToProviderHexString = Buffer.from(
      amountToProviderBuffer
    ).toString("hex"); // Gets the hexadecimal representation from the Buffer
    const amountToProvider = BigInt("0x" + amountToProviderHexString); // Convert hexadecimal representation to a big integer

    const deviceTransactionIdNg =
      deviceTransactionIdNgBuffer?.toString("hex") || undefined;
    this.logger.log("Values", { ...decodePayload });
    return {
      ...decodePayload,
      amountToWallet,
      amountToProvider,
      deviceTransactionIdNg,
    };
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
    canSpendAmount(fromAccount, fromAmountAtomic, this.logger);

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
          swapStep: getSwapStep(error),
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
        this.handleError(error);
        throw error;
      });

    // Check enough fund on the amount set when the sell sdk is called
    const initialAtomicAmount = convertToAtomicUnit(fromAmount, currency);
    canSpendAmount(account, initialAtomicAmount, this.logger);

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
        BigInt(initialAtomicAmount.toString())
      ).catch((error: Error) => {
        this.logger.log("errors?", error);
        throw error;
      });

    this.logger.log("before decoded payload");

    const payloadHex = binaryPayload.toString("hex");

    this.logger.log("payloadHex!!", payloadHex);

    try {
      const decodedPayload = await this.decodePayloadProtobuf(
        binaryPayload.toString("hex")
      );
      this.logger.log("decoded payload", decodedPayload);
    } catch (e) {
      this.logger.log("E", e);
    }

    // Check enough fund on the amount being set on the sell payload
    const fromAmountAtomic = convertToAtomicUnit(amount, currency);
    canSpendAmount(account, fromAmountAtomic, this.logger);

    this.logger.log("Payload received:", {
      recipientAddress,
      amount: fromAmountAtomic,
      binaryPayload,
      signature,
    });

    // 3 - Send payload
    const transaction = await this.walletAPIDecorator
      .createTransaction({
        recipient: recipientAddress,
        amount: fromAmountAtomic,
        currency,
        customFeeConfig,
      })
      .catch((error: Error) => {
        throw error;
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

function canSpendAmount(
  account: Account,
  amount: bigint,
  logger: Logger
): void {
  if (
    account.spendableBalance.isGreaterThanOrEqualTo(
      new BigNumber(amount.toString())
    ) === false
  ) {
    const err = new NotEnoughFunds();
    logger.error(err);
    throw err;
  }
  return;
}

function convertToAtomicUnit(amount: BigNumber, currency: Currency): bigint {
  const convertedNumber = amount.shiftedBy(currency.decimals);
  if (!convertedNumber.isInteger()) {
    throw new Error("Unable to convert amount to atomic unit");
  }
  return BigInt(convertedNumber.toNumber());
}

function getSwapStep(error: Error): string {
  if ((error as CompleteExchangeError).step) {
    return (error as CompleteExchangeError).step;
  } else if (error.name === "DisabledTransactionBroadcastError") {
    return "SIGN_COIN_TRANSACTION";
  }

  return "UNKNOWN_STEP";
}
