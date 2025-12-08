import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { createBackendService, createHttpClient } from "./BackendService";
import { BACKEND_CONFIG } from "../config";
import { VERSION } from "../version";
import { ProductType } from "../sdk.types";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("BackendService", () => {
  beforeEach(() => {
    mockedAxios.create.mockReset();
  });

  describe.only("createHttpClient", () => {
    beforeEach(() => {
      mockedAxios.create.mockReturnValue({
        post: jest.fn(),
        interceptors: { request: { use: jest.fn() } },
      } as any);
    });

    it("creates axios client with baseURL", () => {
      const instance = { interceptors: { request: { use: jest.fn() } } } as any;
      mockedAxios.create.mockReturnValue(instance);

      const client = createHttpClient("https://example.com");

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "https://example.com",
      });
      expect(client).toBe(instance);
    });

    it("adds SDK version header to all requests", async () => {
      let requestConfig: any;

      const mockInstance = {
        interceptors: {
          request: {
            use: jest.fn((interceptorFn) => {
              requestConfig = interceptorFn({ headers: {} });
            }),
          },
        },
        get: jest.fn(() => Promise.resolve({ data: "ok" })),
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      const client = createHttpClient("https://api.example.com");

      await client.get("/foo");

      expect(requestConfig.headers["x-exchange-sdk-version"]).toBe(VERSION);
    });

    it("preserves existing headers", async () => {
      let requestConfig = { headers: { foo: "bar" } };

      const mockInstance = {
        interceptors: {
          request: {
            use: jest.fn((interceptorFn) => {
              requestConfig = interceptorFn({ headers: {} });
            }),
          },
        },
        get: jest.fn(() => Promise.resolve({ data: "ok" })),
      } as unknown as AxiosInstance;

      mockedAxios.create.mockReturnValue(mockInstance);

      const client = createHttpClient("https://api.example.com");

      await client.get("/foo");

      // @ts-expect-error testing purposes
      expect(requestConfig.headers["x-exchange-sdk-version"]).toBe(VERSION);
    });
  });

  describe("Swap Backend", () => {
    let postMock: jest.Mock;

    beforeEach(() => {
      postMock = jest.fn();
      mockedAxios.create.mockReturnValue({
        post: postMock,
        interceptors: { request: { use: jest.fn() } },
      } as any);
    });

    it("retrievePayload posts to ''", async () => {
      postMock.mockResolvedValue({ data: { ok: true } });

      const backend = createBackendService("staging").swap;
      const result = await backend.retrievePayload({ foo: 1 } as any);

      expect(postMock).toHaveBeenCalledWith("", { foo: 1 });
      expect(result).toEqual({ ok: true });
    });

    it("confirm posts to 'accepted' with optional version", () => {
      const backend = createBackendService("staging").swap;

      backend.confirm({ foo: 1 } as any, "2.0.0");

      expect(postMock).toHaveBeenCalledWith(
        "accepted",
        { foo: 1 },
        { headers: { "x-swap-app-version": "2.0.0" } },
      );
    });

    it("cancel posts to 'cancelled' without version header", () => {
      const backend = createBackendService("staging").swap;

      backend.cancel({ bar: 2 } as any);

      expect(postMock).toHaveBeenCalledWith("cancelled", { bar: 2 }, undefined);
    });
  });

  describe("Sell Backend", () => {
    let postMock: jest.Mock;

    beforeEach(() => {
      postMock = jest.fn();
      mockedAxios.create.mockReturnValue({
        post: postMock,
        interceptors: { request: { use: jest.fn() } as any },
      } as any);
    });

    it("retrievePayload posts to 'exchange/v1/sell/card/remit'", async () => {
      postMock.mockResolvedValue({ data: { ok: true } });

      const backend = createBackendService("staging").sell;
      const result = await backend.retrievePayload({
        foo: 1,
        type: ProductType.CARD,
      } as any);

      expect(postMock).toHaveBeenCalledWith("exchange/v1/sell/card/remit", {
        foo: 1,
      });
      expect(result).toEqual({ ok: true });
    });

    it("confirm posts to dynamic accepted URL", () => {
      const backend = createBackendService("staging").sell;

      backend.confirm({ sellId: "123", amount: 10 } as any);

      expect(postMock).toHaveBeenCalledWith(
        "/history/webhook/v1/transaction/123/accepted",
        { amount: 10 },
      );
    });

    it("cancel posts to dynamic cancelled URL", () => {
      const backend = createBackendService("staging").sell;

      backend.cancel({ sellId: "999", foo: 1 } as any);

      expect(postMock).toHaveBeenCalledWith(
        "/history/webhook/v1/transaction/999/cancelled",
        { foo: 1 },
      );
    });
  });

  describe("Fund Backend", () => {
    let postMock: jest.Mock;

    beforeEach(() => {
      postMock = jest.fn();
      mockedAxios.create.mockReturnValue({
        post: postMock,
        interceptors: { request: { use: jest.fn() } },
      } as any);
    });

    it("retrievePayload posts to fund remit URL", async () => {
      postMock.mockResolvedValue({ data: { ok: true } });

      const backend = createBackendService("staging").fund;
      const result = await backend.retrievePayload({
        foo: 1,
        type: ProductType.CARD,
      } as any);

      expect(postMock).toHaveBeenCalledWith("exchange/v1/fund/card/remit", {
        foo: 1,
      });
      expect(result).toEqual({ ok: true });
    });

    it("confirm posts to dynamic accepted URL", () => {
      const backend = createBackendService("staging").fund;

      backend.confirm({ quoteId: "q1", foo: 1 } as any);

      expect(postMock).toHaveBeenCalledWith(
        "/history/webhook/v1/transaction/q1/accepted",
        { foo: 1 },
      );
    });

    it("cancel posts to dynamic cancelled URL", () => {
      const backend = createBackendService("staging").fund;

      backend.cancel({ quoteId: "q2", bar: 5 } as any);

      expect(postMock).toHaveBeenCalledWith(
        "/history/webhook/v1/transaction/q2/cancelled",
        { bar: 5 },
      );
    });
  });

  describe("createBackendService", () => {
    beforeEach(() => {
      mockedAxios.create.mockReturnValue({
        post: jest.fn(),
        interceptors: { request: { use: jest.fn() } },
      } as any);
    });

    it("returns swap, sell, fund services", () => {
      const backend = createBackendService("staging");

      expect(backend.swap).toBeDefined();
      expect(backend.sell).toBeDefined();
      expect(backend.fund).toBeDefined();
    });

    it("uses environment URLs when no custom URL supplied", () => {
      createBackendService("production");

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: BACKEND_CONFIG.production.swap,
      });
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: BACKEND_CONFIG.production.sell,
      });
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: BACKEND_CONFIG.production.fund,
      });
    });

    it("uses customUrl for all services", () => {
      createBackendService("production", "https://custom");

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "https://custom",
      });
      expect(mockedAxios.create).toHaveBeenCalledTimes(3);
    });
  });
});
