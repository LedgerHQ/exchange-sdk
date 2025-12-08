import { BACKEND_CONFIG, Environment, exchangeProductConfig } from "../config";
import axios, { AxiosInstance } from "axios";
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
  SwapPayloadRequestData,
  SwapPayloadResponse,
} from "./BackendService.types";
import { VERSION } from "../version";
import { ExchangeType } from "../sdk.types";

export const createBackendService = (env: Environment, customUrl?: string) => {
  const urls = customUrl
    ? { swap: customUrl, sell: customUrl, fund: customUrl }
    : BACKEND_CONFIG[env];

  return {
    swap: createSwapBackend(createHttpClient(urls.swap)),
    sell: createSellBackend(createHttpClient(urls.sell)),
    fund: createFundBackend(createHttpClient(urls.fund)),
  };
};

const createSwapBackend = (client: AxiosInstance) => ({
  retrievePayload: async (req: SwapPayloadRequestData) => {
    const res = await client.post<SwapPayloadResponse>("", req);
    return res.data;
  },

  confirm: (payload: ConfirmSwapRequest, swapAppVersion?: string) =>
    client.post(
      "accepted",
      payload,
      swapAppVersion
        ? { headers: { "x-swap-app-version": swapAppVersion } }
        : undefined,
    ),

  cancel: (payload: CancelSwapRequest, swapAppVersion?: string) =>
    client.post(
      "cancelled",
      payload,
      swapAppVersion
        ? { headers: { "x-swap-app-version": swapAppVersion } }
        : undefined,
    ),
});

const createSellBackend = (client: AxiosInstance) => ({
  retrievePayload: async ({ type, ...req }: SellRequestPayload) => {
    const endpoint = exchangeProductConfig[ExchangeType.SELL]?.[type]?.endpoint;

    if (!endpoint) {
      throw new Error(
        `Unsupported product type ${type} for ${ExchangeType.SELL}`,
      );
    }

    const res = await client.post<SellResponsePayload>(endpoint, req);
    return res.data;
  },

  confirm: (body: ConfirmSellRequest) => {
    const { sellId, ...payload } = body;
    return client.post(
      `/history/webhook/v1/transaction/${sellId}/accepted`,
      payload,
    );
  },
  cancel: (body: CancelSellRequest) => {
    const { sellId, ...payload } = body;
    return client.post(
      `/history/webhook/v1/transaction/${sellId}/cancelled`,
      payload,
    );
  },
});

export const createFundBackend = (client: AxiosInstance) => ({
  retrievePayload: async ({
    type,
    ...req
  }: FundRequestPayload): Promise<FundResponsePayload> => {
    const endpoint = exchangeProductConfig[ExchangeType.FUND]?.[type]?.endpoint;

    if (!endpoint) {
      throw new Error(
        `Unsupported product type ${type} for ${ExchangeType.FUND}`,
      );
    }

    const res = await client.post<FundResponsePayload>(endpoint, req);
    return res.data;
  },

  confirm: ({ quoteId, ...payload }: ConfirmFundRequest) =>
    client.post(`/history/webhook/v1/transaction/${quoteId}/accepted`, payload),

  cancel: ({ quoteId, ...payload }: CancelFundRequest) =>
    client.post(
      `/history/webhook/v1/transaction/${quoteId}/cancelled`,
      payload,
    ),
});

export function createHttpClient(baseURL: string) {
  const client = axios.create({ baseURL });

  client.interceptors.request.use((config) => {
    config.headers = config.headers || {};
    config.headers["x-exchange-sdk-version"] = VERSION;
    return config;
  });

  return client;
}
