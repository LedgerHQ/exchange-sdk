import axios from "axios";
import { Account } from "@ledgerhq/wallet-api-client";
import BigNumber from "bignumber.js";
import { decodeSellPayload } from "@ledgerhq/hw-app-exchange";
import { BEData, ExchangeType } from "./sdk";

const SWAP_BACKEND_URL = "https://swap.ledger.com/v5/swap";
const SELL_BACKEND_URL = "https://buy.api.aws.stg.ldg-tech.com/"; //"https://buy.api.aws.prd.ldg-tech.com/";


let swapAxiosClient = axios.create({
  baseURL: SWAP_BACKEND_URL,
});

let sellAxiosClient = axios.create({
  baseURL: SELL_BACKEND_URL,
});

/**
 * Override the default axios client base url environment (default is production)
 * @param {string} url
 */
export function setBackendUrl(url: string) {
  swapAxiosClient = axios.create({
    baseURL: url,
  });
  sellAxiosClient = axios.create({
    baseURL: url,
  });
}

/**
 * SWAP *
 **/

export type SwapPayloadRequestData = {
  provider: string;
  deviceTransactionId: string;
  fromAccount: Account;
  toAccount: Account;
  amount: BigNumber;
  amountInAtomicUnit: BigNumber;
  quoteId?: string;
  toNewTokenId?: string;
};
export type SwapPayloadResponse = {
  binaryPayload: string;
  signature: string;
  payinAddress: string;
  swapId: string;
  payinExtraId?: string;
  extraTransactionParameters?: string,
};

export async function retrieveSwapPayload(
  data: SwapPayloadRequestData
): Promise<SwapPayloadResponse> {
  const request = {
    provider: data.provider,
    deviceTransactionId: data.deviceTransactionId,
    from: data.fromAccount.currency,
    to: data.toNewTokenId || data.toAccount.currency,
    address: data.toAccount.address,
    refundAddress: data.fromAccount.address,
    amountFrom: data.amount.toString(),
    amountFromInSmallestDenomination: Number(data.amountInAtomicUnit),
    rateId: data.quoteId,
  };
  const res = await swapAxiosClient.post("", request);

  return parseSwapBackendInfo(res.data);
}

export type ConfirmSwapRequest = {
  provider: string;
  swapId: string;
  transactionId: string;
  sourceCurrencyId?: string;
  targetCurrencyId?: string;
  hardwareWalletType?: string;
};

export type ConfirmSellRequest = {
  provider: string;
  quoteId: string;
  transactionId: string;
};

export async function confirmSwap(payload: ConfirmSwapRequest) {
  await swapAxiosClient.post("accepted", payload);
}

export async function confirmSell(data: ConfirmSellRequest) {
  const { quoteId, ...payload } = data
  await sellAxiosClient.post(`/webhook/v1/transaction/${quoteId}/accepted`, payload);
}

export type CancelSwapRequest = {
  provider: string;
  swapId: string;
  statusCode?: string;
  errorMessage?: string;
  sourceCurrencyId?: string;
  targetCurrencyId?: string;
  hardwareWalletType?: string;
  swapType?: string;
  swapStep?: string;
};

export type CancelSellRequest = {
  provider: string;
  quoteId: string;
  statusCode?: string;
  errorMessage?: string;
};

export async function cancelSwap(payload: CancelSwapRequest) {
  await swapAxiosClient.post("cancelled", payload);
}

export async function cancelSell(data: CancelSellRequest) {
  const { quoteId, ...payload } = data
  await sellAxiosClient.post(`/webhook/v1/transaction/${quoteId}/cancelled`, payload);
}

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
  payinExtraId?: string;
  extraTransactionParameters?: string;
};

function parseSwapBackendInfo(response: SwapBackendResponse): {
  binaryPayload: string;
  signature: string;
  payinAddress: string;
  swapId: string;
  payinExtraId?: string;
  extraTransactionParameters?: string;
} {
  return {
    binaryPayload: response.binaryPayload,
    signature: response.signature,
    payinAddress: response.payinAddress,
    swapId: response.swapId,
    payinExtraId: response.payinExtraId,
    extraTransactionParameters: response.extraTransactionParameters,
  };
}

/**
 * SELL *
 **/

export interface SellRequestPayload {
  quoteId: string;
  provider: string;
  fromCurrency: string;
  toCurrency: string;
  refundAddress: string;
  amountFrom: number;
  amountTo: number;
  nonce: string;
  type: string;
}

export interface SellResponsePayload {
  sellId: string;
  payinAddress: string;
  createdAt: string;
  providerFees: number;
  referralFees: number;
  payoutNetworkFees: number;
  providerSig: {
    payload: string;
    signature: string;
  };
}

const parseSellBackendInfo = (response: SellResponsePayload) => {
  return {
    quoteId: response.sellId,
    payinAddress: response.payinAddress,
    providerSig: {
      payload: response.providerSig.payload,
      signature: response.providerSig.signature,
    },
  };
};

export async function retrieveSellPayload(data: SellRequestPayload) {
  const request = {
    quoteId: data.quoteId,
    provider: data.provider,
    fromCurrency: data.fromCurrency,
    toCurrency: data.toCurrency,
    refundAddress: data.refundAddress,
    amountFrom: data.amountFrom,
    amountTo: data.amountTo,
    nonce: data.nonce,
  };
  const pathname = data.type === ExchangeType.SELL ? "sell/v1/remit" : "card/v1/remit";
  console.log('sergiutest: before making the post to our backedn', { request })
  const res = await sellAxiosClient.post(pathname, request);
  console.log('sergiutest: maksym', { res })
  return parseSellBackendInfo(res.data);
}

export async function decodeSellPayloadAndPost(
  binaryPayload: string,
  beData: BEData,
  providerId: string
) {
  try {
    const { inCurrency, outCurrency, inAddress } =
      await decodeSellPayload(binaryPayload);

    const payload = {
      quoteId: beData.quoteId,
      provider: providerId,
      fromCurrency: inCurrency,
      toCurrency: outCurrency,
      address: inAddress,
      amountFrom: beData.outAmount,
      amountTo: beData.inAmount,

      // These 3 values are null for now as we do not receive them.
      country: null,
      providerFee: null,
      referralFee: null,
    };

    sellAxiosClient.post("/forgeTransaction/offRamp", payload);
  } catch (e) {
    console.log("Error decoding payload", e);
  }
}
