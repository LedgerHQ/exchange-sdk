import { Account, Transaction, WalletAPIClient, WindowMessageTransport } from "@ledgerhq/wallet-api-client";
import BigNumber from "bignumber.js";
import axios from "axios";

export type SwapInfo = {
  quoteId?: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmount: BigInt;
  feeStrategy: FeeStrategy,
};

export type FeeStrategy = "SLOW" | "MEDIUM" | "FAST";

type UserAccounts = {fromAccount: Account; toAccount: Account};

type SwapBackendResponse = {
  "provider": string;
  "swapId": string;
  "apiExtraFee": number;
  "apiFee": number;
  "refundAddress": string;
  "amountExpectedFrom": number;
  "amountExpectedTo": number;
  "status": string;
  "from": string;
  "to": string;
  "payinAddress": string;
  "payoutAddress": string;
  "createdAt": string;// ISO-8601
  "binaryPayload": string;
  "signature": string;
};

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

  constructor(transport?: WindowMessageTransport) {
    if (!transport) {
      this.transport = new WindowMessageTransport();
      this.transport.connect();
    }
    this.walletAPI = new WalletAPIClient(this.transport);
  }

  async swap(info: SwapInfo) {
    const { fromAccountId, toAccountId, fromAmount, feeStrategy, provider, quoteId } = info;
    const { fromAccount, toAccount } = await this.retrieveUserAccounts({fromAccountId, toAccountId});
    console.log(fromAccount);
    console.log(toAccount);
    const [fromCurrency] = await this.walletAPI.currency.list({currencyIds: [fromAccount.currency]});

    console.log("*** Start Swap ***");
    // 1 - Ask for deviceTransactionId
    const deviceTransactionId = await this.walletAPI.exchange.start(ExchangeType.SWAP).catch((error: Error) => {throw new NonceStepError(error)});
    console.log("== DeviceTransactionId retrieved:", deviceTransactionId);

    // 2 - Ask for payload creation
    const axiosClient = axios.create({
      headers: {
        'Access-Control-Allow-Origin': "*"
      }
    });
    const res = await axiosClient.post("https://swap.aws.stg.ldg-tech.com/v5/swap", {
      provider,
      deviceTransactionId,
      from: fromAccount.currency,
      to: toAccount.currency,
      address: toAccount.address,
      refundAddress: fromAccount.address,
      amountFrom: fromAmount.toString(),
      // swapId: quoteId, //pending ask GUilhem
      // rateId: quoteId,
      quoteId: quoteId,
    });
  
    console.log("Backend result:", res);
    // const response: SwapBackendResponse = res.data;
    const { binaryPayload, signature, payinAddress } = this.parseSwapBackendInfo(res.data);

    // 3 - Send payload
    const transaction = this.createTransaction({
      recipient: payinAddress,
      amount: fromAmount,
      family: fromCurrency.parent,
    });
    const tx = await this.walletAPI.exchange.completeSwap({
      provider,
      fromAccountId,
      toAccountId,
      transaction,
      binaryPayload,
      signature,
      feeStrategy,
    }).catch((error: Error) => {throw new SignatureStepError(error)});
    console.log("== Transaction sent:", tx);
    console.log("*** End Swap ***");
  }

  disconnect() {
    this.transport.disconnect();
  }

  private async retrieveUserAccounts(accounts: {fromAccountId: string; toAccountId: string}): Promise<UserAccounts> {
    const { fromAccountId, toAccountId } = accounts;
    const allAccounts = await this.walletAPI.account.list();
    return {
      fromAccount: allAccounts.find((value) => value.id === fromAccountId),
      toAccount: allAccounts.find((value) => value.id === toAccountId)
    }
  }

  private parseSwapBackendInfo(response: SwapBackendResponse): {binaryPayload: Buffer; signature: Buffer; payinAddress: string;} {
    return {
      binaryPayload: Buffer.from(response.binaryPayload, "hex"),
      signature: Buffer.from(response.signature, "hex"),
      payinAddress: response.payinAddress,
    };
  }

  private createTransaction({recipient, amount, family}:{recipient: string, amount: BigInt, family: string}): Transaction {
    return {
      family,
      amount: new BigNumber(amount.toString()),
      recipient,
    }
  }
}

