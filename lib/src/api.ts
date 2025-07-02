import axios from "axios";
import { decodeSellPayload } from "@ledgerhq/hw-app-exchange";
import { ExchangeType, ProductType } from "./sdk.types";
import {
  CancelFundRequest,
  CancelSellRequest,
  CancelSwapRequest,
  CancelTokenApprovalRequest,
  ConfirmFundRequest,
  ConfirmSellRequest,
  ConfirmSwapRequest,
  ConfirmTokenApprovalRequest,
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

export async function confirmSwap(
  payload: ConfirmSwapRequest,
  swapAppVersion?: string,
) {
  const headers = swapAppVersion
    ? { "x-swap-app-version": swapAppVersion }
    : undefined;
  await swapAxiosClient.post("accepted", payload, { headers });
}

export async function cancelSwap(
  payload: CancelSwapRequest,
  swapAppVersion?: string,
) {
  const headers = swapAppVersion
    ? { "x-swap-app-version": swapAppVersion }
    : undefined;
  await swapAxiosClient.post("cancelled", payload, { headers });
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

type UDecimal = {
  coefficient: Uint8Array;
  exponent: number;
};

const decodeAmount = (val: Uint8Array | UDecimal) => {
  if (val instanceof Uint8Array) {
    // Decode Uint8Array directly
    const scalingFactor = 1e8;
    const bufferVal = Buffer.from(val);
    return bufferVal.readUIntBE(0, bufferVal.length) / scalingFactor;
  }

  if (val?.coefficient && val?.exponent !== undefined) {
    // Decode UDecimal properly
    const coefficientBuffer = Buffer.from(val.coefficient);
    const coefficient = coefficientBuffer.readUIntBE(
      0,
      coefficientBuffer.length,
    );

    // Apply exponent as a divisor for decimal places
    return coefficient / Math.pow(10, Math.abs(val.exponent));
  }

  throw new Error("Unsupported type for decodeAmount");
};

export async function decodeSellPayloadAndPost(
  binaryPayload: Buffer,
  providerId: string,
) {
  try {
    const bufferPayload = Buffer.from(
      binaryPayload.toString(),
      "base64",
    ) as unknown as string;

    const { inCurrency, outCurrency, inAddress, inAmount, outAmount } =
      await decodeSellPayload(bufferPayload);

    const amountTo = decodeAmount(outAmount as Uint8Array);
    const amountFrom = decodeAmount(inAmount as UDecimal);

    const payload = {
      quoteId: null,
      provider: providerId,
      fromCurrency: inCurrency,
      toCurrency: outCurrency,
      address: inAddress,
      amountFrom,
      amountTo,

      // These 3 values are null for now as we do not receive them.
      country: null,
      providerFee: null,
      referralFee: null,
    };

    const res = await sellAxiosClient.post(
      "/sell/v1/forgeTransaction/offRamp",
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

/**
 * TOKEN APPROVAL *
 **/

export async function confirmTokenApproval(data: ConfirmTokenApprovalRequest) {
  // TODO: uncomment when ready
  // const { orderId, ...payload } = data;
  // await tokenApprovalAxiosClient.post(
  //   `/webhook/v1/transaction/token-approval/${orderId}/accepted`,
  //   payload,
  // );

  console.log("*** CONFIRM TOKEN APPROVAL ***", data);
}

export async function cancelTokenApproval(data: CancelTokenApprovalRequest) {
  // TODO: uncomment when ready
  // const { orderId, ...payload } = data;
  // await tokenApprovalAxiosClient.post(
  //   `/webhook/v1/transaction/token-approval/${orderId}/cancelled`,
  //   payload,
  // );

  console.log("*** CANCEL TOKEN APPROVAL ***", data);
}
