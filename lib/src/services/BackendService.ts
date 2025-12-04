import { BACKEND_CONFIG, Environment } from "../config";
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
  SwapPayloadRequestData,
} from "../api.types";
import { VERSION } from "../version";

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
    const res = await client.post("", req);
    return res.data;
  },

  confirm: (payload: ConfirmSwapRequest, swapAppVersion: string) =>
    client.post(
      "accepted",
      payload,
      swapAppVersion
        ? { headers: { "x-swap-app-version": swapAppVersion } }
        : undefined,
    ),

  cancel: (payload: CancelSwapRequest, swapAppVersion: string) =>
    client.post(
      "cancelled",
      payload,
      swapAppVersion
        ? { headers: { "x-swap-app-version": swapAppVersion } }
        : undefined,
    ),
});

const createSellBackend = (client: AxiosInstance) => ({
  retrievePayload: async (req: SellRequestPayload) => {
    const res = await client.post("sell/payload", req);
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
      `/history/webhook/v1/transaction/${sellId}/accepted`,
      payload,
    );
  },
});

export const createFundBackend = (client: AxiosInstance) => ({
  retrievePayload: async (
    req: FundRequestPayload,
  ): Promise<FundResponsePayload> => {
    const res = await client.post("exchange/v1/fund/card/remit", req);
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

function createHttpClient(baseURL: string) {
  const client = axios.create({ baseURL });

  client.interceptors.request.use((config) => {
    config.headers = config.headers || {};
    config.headers["x-exchange-sdk-version"] = VERSION;
    return config;
  });

  return client;
}
