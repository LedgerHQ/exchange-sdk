import axios from "axios";
import { BackendService } from "./BackendService";

jest.mock("axios");

const mockGet = jest.fn();
const mockInterceptorUse = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (axios.create as jest.Mock).mockReturnValue({
    get: mockGet,
    interceptors: { request: { use: mockInterceptorUse } },
  });
});

describe("BackendService", () => {
  describe("constructor", () => {
    it("creates a buy API client pointed at the production URL by default", () => {
      new BackendService({});

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: "https://buy.api.live.ledger.com",
      });
    });

    it("creates a buy API client pointed at the staging URL", () => {
      new BackendService({ environment: "staging" });

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: "https://buy.api.aws.stg.ldg-tech.com",
      });
    });
  });

  describe("getLedgerSessionId", () => {
    it("returns the session ID from the buy API", async () => {
      mockGet.mockResolvedValue({ data: { ledgerSessionId: "sess-123" } });

      const service = new BackendService({});
      const result = await service.getLedgerSessionId();

      expect(mockGet).toHaveBeenCalledWith("/session", { params: undefined });
      expect(result).toBe("sess-123");
    });

    it("appends providerSessionId as a query param when provided", async () => {
      mockGet.mockResolvedValue({ data: { ledgerSessionId: "sess-456" } });

      const service = new BackendService({});
      await service.getLedgerSessionId("provider-session-1");

      expect(mockGet).toHaveBeenCalledWith("/session", {
        params: { providerSessionId: "provider-session-1" },
      });
    });

    it("returns null and logs when the response is missing ledgerSessionId", async () => {
      mockGet.mockResolvedValue({ data: {} });
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const service = new BackendService({});
      const result = await service.getLedgerSessionId();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("returns null and logs on network error", async () => {
      mockGet.mockRejectedValue(new Error("Network error"));
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const service = new BackendService({});
      const result = await service.getLedgerSessionId();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
