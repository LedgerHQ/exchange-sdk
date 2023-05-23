import {
  Account,
  CryptoCurrency,
  Currency,
  Transaction,
  WalletAPIClient,
  WindowMessageTransport,
} from "@ledgerhq/wallet-api-client";
import BigNumber from "bignumber.js";
import axios from "axios";
import { NonceStepError, PayloadStepError, SignatureStepError } from "./error";

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

type SwapBackendResponse = {
  provider: string;
  swapId: string;
  apiExtraFee: number;
  apiFee: number;
  refundAddress: string;
  amountExpectedFrom: number;
  amountExpectedTo: number;
  status: string;
  from: string;
  to: string;
  payinAddress: string;
  payoutAddress: string;
  createdAt: string; // ISO-8601
  binaryPayload: string;
  signature: string;
};

// Should be available from the WalletAPI (zod :( )
const ExchangeType = {
  FUND: "FUND",
  SELL: "SELL",
  SWAP: "SWAP",
} as const;

const SWAP_BACKEND_URL = "https://swap.aws.stg.ldg-tech.com/v5";

/**
 *
 */
// Note: maybe to use to disconnect the Transport: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
export class ExchangeSDK {
  readonly providerId: string;

  private transport: WindowMessageTransport;
  readonly walletAPI: WalletAPIClient;

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
    const { fromAccountId, toAccountId, fromAmount, feeStrategy, quoteId } =
      info;
    const { fromAccount, toAccount, fromCurrency } =
      await this.retrieveUserAccounts({
        fromAccountId,
        toAccountId,
      });
    console.log("User info:");
    console.log(fromAccount);
    console.log(toAccount);
    console.log(fromCurrency);

    console.log("*** Start Swap ***");
    // 1 - Ask for deviceTransactionId
    const deviceTransactionId = await this.walletAPI.exchange
      .start(ExchangeType.SWAP)
      .catch((error: Error) => {
        throw new NonceStepError(error);
      });
    console.log("== DeviceTransactionId retrieved:", deviceTransactionId);

    // 2 - Ask for payload creation
    const axiosClient = axios.create({
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
    const res = await axiosClient
      .post(`${SWAP_BACKEND_URL}/swap`, {
        provider: this.providerId,
        deviceTransactionId,
        from: fromAccount.currency,
        to: toAccount.currency,
        address: toAccount.address,
        refundAddress: fromAccount.address,
        amountFrom: fromAmount.toString(),
        // rateId: quoteId,
      })
      .catch((error: Error) => {
        console.error(error);
        throw new PayloadStepError(error);
      });

    // console.log("Backend result:", res);
    const { binaryPayload, signature, payinAddress } =
      this.parseSwapBackendInfo(res.data);

    // 3 - Send payload
    const transaction = this.createTransaction({
      recipient: payinAddress,
      amount: fromAmount,
      family: fromCurrency.parent ?? fromCurrency.family,
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
      .catch((error: Error) => {
        throw new SignatureStepError(error);
      });
    console.log("== Transaction sent:", tx);
    console.log("*** End Swap ***");
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
    console.log("retrieveUserAccounts", fromAccount);
    let [fromCurrency]: Array<Currency> = await this.walletAPI.currency.list({
      currencyIds: [fromAccount.currency],
    });
    if (fromCurrency.type === "TokenCurrency") {
      [fromCurrency] = await this.walletAPI.currency.list({
        currencyIds: [fromCurrency.parent],
      });
    }

    return {
      fromAccount,
      toAccount,
      fromCurrency,
    };
  }

  private parseSwapBackendInfo(response: SwapBackendResponse): {
    binaryPayload: Buffer;
    signature: Buffer;
    payinAddress: string;
  } {
    return {
      binaryPayload: Buffer.from(response.binaryPayload, "hex"),
      signature: Buffer.from(response.signature, "hex"),
      payinAddress: response.payinAddress,
    };
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
