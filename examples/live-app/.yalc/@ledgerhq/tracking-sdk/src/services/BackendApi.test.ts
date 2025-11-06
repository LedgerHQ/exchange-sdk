import { BackendApiService } from "./BackendApi";
import type { SDKConfig } from "../sdk.types";

jest.mock("../config/environment", () => ({
  environmentConfig: {
    staging: { BUY_API_URL: "https://staging.example.com" },
  },
}));

(globalThis.fetch as jest.Mock) = jest.fn();

describe("BackendApiService", () => {
  const mockFetch = globalThis.fetch as jest.Mock;

  const config: SDKConfig = {
    environment: "staging",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches the ledgerSessionId successfully", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ ledgerSessionId: "ledger123" }),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const service = new BackendApiService(config);
    const result = await service.getLedgerSessionId();

    expect(mockFetch).toHaveBeenCalledWith(
      new URL("https://staging.example.com/session"),
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(mockResponse.json).toHaveBeenCalled();
    expect(result).toBe("ledger123");
  });

  it("adds the providerSessionId to the request url if it exists", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ ledgerSessionId: "ledger123" }),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const service = new BackendApiService({
      environment: "staging",
      providerSessionId: "xxxx",
    });
    const result = await service.getLedgerSessionId();

    expect(mockFetch).toHaveBeenCalledWith(
      new URL("https://staging.example.com/session?providerSessionId=xxxx"),
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(mockResponse.json).toHaveBeenCalled();
    expect(result).toBe("ledger123");
  });

  it("throws when HTTP response is not OK", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: jest.fn(),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const service = new BackendApiService(config);

    await expect(service.getLedgerSessionId()).rejects.toThrow(
      "HTTP 500 – Internal Server Error"
    );
  });

  it("throws when response is missing ledgerSessionId", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const service = new BackendApiService(config);

    await expect(service.getLedgerSessionId()).rejects.toThrow(
      "Response missing 'ledgerSessionId'"
    );
  });

  it("throws when fetch fails (network error)", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));

    const service = new BackendApiService(config);

    await expect(service.getLedgerSessionId()).rejects.toThrow(
      "Network failure"
    );
  });
});
