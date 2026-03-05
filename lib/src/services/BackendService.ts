import {
  BACKEND_CONFIG,
  Environment,
  exchangeProductConfig,
  webhookEndpoints,
} from "../config";
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
  SwapPayloadResponse,
  SwapRequestPayload,
} from "./BackendService.types";
import { VERSION } from "../version";
import { ExchangeType, ProductType } from "../sdk.types";

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

const createSwapBackend = (client: AxiosInstance) => {
  const withVersionHeader = (swapAppVersion?: string) =>
    swapAppVersion
      ? { headers: { "x-swap-app-version": swapAppVersion } }
      : undefined;

  return {
    retrievePayload: async (req: SwapRequestPayload) => {
      const endpoint = getEndpoint(ExchangeType.SWAP, ProductType.SWAP);
      const res = await client.post<SwapPayloadResponse>(endpoint, req);
      return res.data;
    },

    confirm: (payload: ConfirmSwapRequest, swapAppVersion?: string) => {
      const endpoint = getEndpoint(ExchangeType.SWAP, ProductType.SWAP);
      return client.post(
        `${endpoint}/accepted`,
        payload,
        withVersionHeader(swapAppVersion),
      );
    },

    cancel: (payload: CancelSwapRequest, swapAppVersion?: string) => {
      const endpoint = getEndpoint(ExchangeType.SWAP, ProductType.SWAP);
      return client.post(
        `${endpoint}/cancelled`,
        payload,
        withVersionHeader(swapAppVersion),
      );
    },
  };
};

const createSellBackend = (client: AxiosInstance) => ({
  retrievePayload: async ({ type, ...req }: SellRequestPayload) => {
    const endpoint = getEndpoint(ExchangeType.SELL, type);
    const res = await client.post<SellResponsePayload>(endpoint, req);
    return res.data;
  },

  confirm: (body: ConfirmSellRequest) => {
    const { sellId, ...payload } = body;
    return client.post(webhookEndpoints.confirm(sellId), payload);
  },
  cancel: (body: CancelSellRequest) => {
    const { sellId, ...payload } = body;
    return client.post(webhookEndpoints.cancel(sellId), payload);
  },
});

export const createFundBackend = (client: AxiosInstance) => ({
  retrievePayload: async ({
    type,
    ...req
  }: FundRequestPayload): Promise<FundResponsePayload> => {
    const endpoint = getEndpoint(ExchangeType.FUND, type);
    const res = await client.post<FundResponsePayload>(endpoint, req);
    return res.data;
  },

  confirm: ({ quoteId, ...payload }: ConfirmFundRequest) =>
    client.post(webhookEndpoints.confirm(quoteId), payload),

  cancel: ({ quoteId, ...payload }: CancelFundRequest) =>
    client.post(webhookEndpoints.cancel(quoteId), payload),
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

function getEndpoint(exchange: ExchangeType, type: ProductType): string {
  const endpoint = exchangeProductConfig[exchange]?.[type]?.endpoint;
  if (!endpoint) {
    throw new Error(`Unsupported product type ${type} for ${exchange}`);
  }
  return endpoint;
}
