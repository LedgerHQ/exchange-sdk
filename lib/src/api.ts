import axios, { AxiosInstance } from "axios";
import {
  decodeSellPayload,
  decodeFundPayload,
} from "@ledgerhq/hw-app-exchange";
import { ExchangeType, ProductType } from "./sdk.types";
import {
  CancelFundRequest,
  CancelSellRequest,
  CancelTokenApprovalRequest,
  ConfirmFundRequest,
  ConfirmSellRequest,
  ConfirmTokenApprovalRequest,
  FundRequestPayload,
  FundResponsePayload,
  SellRequestPayload,
  SellResponsePayload,
  SupportedProductsByExchangeType,
} from "./api.types";
import { SellPayload } from "@ledgerhq/hw-app-exchange/lib/SellUtils";
import { VERSION } from "./version";

const SELL_BACKEND_URL = "https://exchange-tx-manager.ledger.com/";
const FUND_BACKEND_URL = "https://exchange-tx-manager.ledger.com/";

const createClientWithVersionInterceptor = (baseURL: string): AxiosInstance => {
  const client = axios.create({ baseURL });

  client.interceptors.request.use((config) => {
    config.headers = config.headers || {};
    config.headers["x-exchange-sdk-version"] = VERSION;
    return config;
  });

  return client;
};

let sellAxiosClient = createClientWithVersionInterceptor(SELL_BACKEND_URL);
let fundAxiosClient = createClientWithVersionInterceptor(FUND_BACKEND_URL);

/**
 * Available product endpoints based on exchange type
 */
export const supportedProductsByExchangeType: SupportedProductsByExchangeType =
  {
    [ExchangeType.SELL]: {
      [ProductType.CARD]: "exchange/v1/sell/card/remit",
      [ProductType.SELL]: "exchange/v1/sell/onramp_offramp/remit",
    },
    [ExchangeType.FUND]: {
      [ProductType.CARD]: "exchange/v1/fund/card/remit",
    },
  };

/**
 * Override the default axios client base url environment (default is production)
 * @param {string} url
 */
export function setBackendUrl(url: string) {
  sellAxiosClient = createClientWithVersionInterceptor(url);
  fundAxiosClient = createClientWithVersionInterceptor(url);
}

/**
 * SELL *
 **/

export async function confirmSell(data: ConfirmSellRequest) {
  const { sellId, ...payload } = data;
  await sellAxiosClient.post(
    `/history/webhook/v1/transaction/${sellId}/accepted`,
    payload,
  );
}

export async function cancelSell(data: CancelSellRequest) {
  const { sellId, ...payload } = data;
  await sellAxiosClient.post(
    `/history/webhook/v1/transaction/${sellId}/cancelled`,
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

export async function decodeBinarySellPayload(binaryPayload: Buffer) {
  try {
    const bufferPayload = Buffer.from(
      binaryPayload.toString(),
      "base64",
    ) as unknown as string;

    return await decodeSellPayload(bufferPayload);
  } catch (e) {
    console.log("Error decoding payload", e);
  }
}

export async function postSellPayload(
  sellPayload: SellPayload,
  providerId: string,
) {
  try {
    const { inCurrency, outCurrency, inAddress, inAmount, outAmount } =
      sellPayload;

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
      "/exchange/sell/v1/forgeTransaction/offRamp",
      payload,
    );

    return res.data?.sellId;
  } catch (e) {
    console.log("Error posting payload", e);
  }
}

/**
 * FUND *
 **/

export async function decodeBinaryFundPayload(binaryPayload: Buffer) {
  try {
    const bufferPayload = Buffer.from(
      binaryPayload.toString(),
      "base64",
    ) as unknown as string;

    return await decodeFundPayload(bufferPayload);
  } catch (e) {
    console.log("Error decoding payload", e);
  }
}

export async function confirmFund(data: ConfirmFundRequest) {
  const { quoteId, ...payload } = data;
  await sellAxiosClient.post(
    `/history/webhook/v1/transaction/${quoteId}/accepted`,
    payload,
  );
}

export async function cancelFund(data: CancelFundRequest) {
  const { quoteId, ...payload } = data;
  await sellAxiosClient.post(
    `/history/webhook/v1/transaction/${quoteId}/cancelled`,
    payload,
  );
}

export async function retrieveFundPayload(data: FundRequestPayload) {
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
    supportedProductsByExchangeType[ExchangeType.FUND][data.type];
  const res = await fundAxiosClient.post(pathname!, request);
  return parseFundBackendInfo(res.data);
}

const parseFundBackendInfo = (response: FundResponsePayload) => {
  return {
    orderId: response.sellId,
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
