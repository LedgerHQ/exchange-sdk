import { Transaction, WalletAPIClient, WindowMessageTransport } from "@ledgerhq/wallet-api-client";
import BigNumber from "bignumber.js";

export type SwapInfo = {
  quoteId: string;
  fromAddressId: string;
  toAddressId: string;
  fromAmount: BigInt;
  toAmount: BigInt;
  fromCurrency: string;
  toCurrency: string;
  feeStrategy: FeeStrategy,
};

export type FeeStrategy = "SLOW" | "MEDIUM" | "FAST";

// Should be available from the WalletAPI (zod :( )
const ExchangeType = {
  FUND: "FUND",
  SELL: "SELL",
  SWAP: "SWAP"
} as const;

class ExchangeError extends Error {
  readonly nestedError: Error | undefined;
  constructor(nestedError?: Error, message?: string) {
    super(message);
    this.name = "ExchangeError";
    this.nestedError = nestedError;
  }
}

class NonceStepError extends ExchangeError {
  constructor(nestedError?: Error, message?: string) {
    super(nestedError, message);
    this.name = "NonceStepError";
  }
}

class PayloadStepError extends ExchangeError {
  constructor(nestedError?: Error, message?: string) {
    super(nestedError, message);
    this.name = "PayloadStepError";
  }
}

class SignatureStepError extends ExchangeError {
  constructor(nestedError?: Error, message?: string) {
    super(nestedError, message);
    this.name = "SignatureStepError";
  }
}

/**
 *
 */
// Note: maybe to use to disconnect the Transport: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
export class ExchangeSDK {
  readonly providerId: string;

  private transport: WindowMessageTransport;
  readonly walletAPI: WalletAPIClient;

  constructor(providerId: string, transport?: WindowMessageTransport) {
    this.providerId = providerId;
    if (!transport) {
      this.transport = new WindowMessageTransport();
      this.transport.connect();
    }
    this.walletAPI = new WalletAPIClient(this.transport);
  }

  async swap(info: SwapInfo) {
    console.log("*** Start Swap ***");
    // 1 - Ask for nonce
    const nonce = await this.walletAPI.exchange.start(ExchangeType.SWAP).catch((error: Error) => {throw new NonceStepError(error)});
    console.log("== Nonce retrieved:", nonce);

    // 2 - Ask for payload creation
    // This step has to call the Ledger's Swap Backend
    const binaryPayload: Buffer = Buffer.from("fffff", "hex");
    const signature: Buffer = Buffer.from("fffff", "hex");
    const payinAddress = "0xdea2666a99047861880b5db08e63cf959f07406f";

    // 3 - Send payload
    const tx = await this.walletAPI.exchange.completeSwap({
      provider: this.providerId,
      fromAccountId: info.fromAddressId,
      toAccountId: info.toAddressId,
      transaction: this.createTransaction(payinAddress, info.fromAmount),
      binaryPayload,
      signature,
      feeStrategy: info.feeStrategy,
    }).catch((error: Error) => {throw new SignatureStepError(error)});
    console.log("== Transaction sent:", tx);
    console.log("*** End Swap ***");
  }

  disconnect() {
    this.transport.disconnect();
  }

  private createTransaction(recipient: string, amount: BigInt): Transaction {
    return {
      family: "ethereum",
      amount: new BigNumber(amount.toString()),
      recipient,
      data: Buffer.from("0xffffff", "hex"),
    }
  }
}
