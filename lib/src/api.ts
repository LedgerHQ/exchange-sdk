import axios from "axios";
import { decodeSellPayload } from "@ledgerhq/hw-app-exchange";
import { BEData, ExchangeType, ProductType } from "./sdk.types";
import {
  CancelFundRequest,
  CancelSellRequest,
  CancelSwapRequest,
  ConfirmFundRequest,
  ConfirmSellRequest,
  ConfirmSwapRequest,
  FundRequestPayload,
  FundResponsePayload,
  SellRequestPayload,
  SellResponsePayload,
  SupportedProductsByExchangeType,
  SwapBackendResponse,
  SwapPayloadRequestData,
  SwapPayloadResponse,
} from "./api.types";

const SWAP_BACKEND_URL = "https://swap.ledger.com/v5/swap";
const SELL_BACKEND_URL = "https://buy.api.aws.prd.ldg-tech.com/";
const FUND_BACKEND_URL = "https://buy.api.aws.prd.ldg-tech.com/";

let swapAxiosClient = axios.create({
  baseURL: SWAP_BACKEND_URL,
});

let sellAxiosClient = axios.create({
  baseURL: SELL_BACKEND_URL,
});

let fundAxiosClient = axios.create({
  baseURL: FUND_BACKEND_URL,
});

/**
 * Available product endpoints based on exchange type
 */
export const supportedProductsByExchangeType: SupportedProductsByExchangeType =
  {
    [ExchangeType.SWAP]: {},
    [ExchangeType.SELL]: {
      [ProductType.CARD]: "card/v1/remit",
      [ProductType.SELL]: "sell/v1/remit",
    },
    [ExchangeType.FUND]: {
      [ProductType.CARD]: "fund/card/v1/remit",
    },
  };

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
  fundAxiosClient = axios.create({
    baseURL: url,
  });
}

/**
 * SWAP *
 **/

export async function retrieveSwapPayload(
  data: SwapPayloadRequestData,
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

export async function confirmSwap(payload: ConfirmSwapRequest) {
  await swapAxiosClient.post("accepted", payload);
}

export async function cancelSwap(payload: CancelSwapRequest) {
  await swapAxiosClient.post("cancelled", payload);
}

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

export async function confirmSell(data: ConfirmSellRequest) {
  const { sellId, ...payload } = data;
  await sellAxiosClient.post(
    `/webhook/v1/transaction/${sellId}/accepted`,
    payload,
  );
}

export async function cancelSell(data: CancelSellRequest) {
  const { sellId, ...payload } = data;
  await sellAxiosClient.post(
    `/webhook/v1/transaction/${sellId}/cancelled`,
    payload,
  );
}

const parseSellBackendInfo = (response: SellResponsePayload) => {
  return {
    sellId: response.sellId,
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
  const pathname =
    supportedProductsByExchangeType[ExchangeType.SELL][data.type];
  const res = await sellAxiosClient.post(pathname!, request);
  return parseSellBackendInfo(res.data);
}

export async function decodeSellPayloadAndPost(
  binaryPayload: string,
  beData: BEData,
  providerId: string,
) {
  try {
    const bufferPayload = Buffer.from(
      binaryPayload,
      "base64",
    ) as unknown as string;

    const { inCurrency, outCurrency, inAddress } =
      await decodeSellPayload(bufferPayload);

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

    const res = await sellAxiosClient.post(
      "/forgeTransaction/offRamp",
      payload,
    );

    return res.data?.sellId;
  } catch (e) {
    console.log("Error decoding payload", e);
  }
}

/**
 * FUND *
 **/

export async function confirmFund(data: ConfirmFundRequest) {
  const { orderId, ...payload } = data;
  await sellAxiosClient.post(
    `/webhook/v1/transaction/${orderId}/accepted`,
    payload,
  );
}

export async function cancelFund(data: CancelFundRequest) {
  const { orderId, ...payload } = data;
  await sellAxiosClient.post(
    `/webhook/v1/transaction/${orderId}/cancelled`,
    payload,
  );
}

export async function retrieveFundPayload(data: FundRequestPayload) {
  const request = {
    orderId: data.orderId,
    provider: data.provider,
    fromCurrency: data.fromCurrency,
    refundAddress: data.refundAddress,
    amountFrom: data.amountFrom,
    nonce: data.nonce,
  };
  const pathname =
    supportedProductsByExchangeType[ExchangeType.FUND][data.type];
  const res = await fundAxiosClient.post(pathname!, request);
  return parseFundBackendInfo(res.data);
}

const parseFundBackendInfo = (response: FundResponsePayload) => {
  return {
    orderId: response.sellId, //TODO: Update this identifier once defined in BE
    payinAddress: response.payinAddress,
    providerSig: {
      payload: response.providerSig.payload,
      signature: response.providerSig.signature,
    },
  };
};
