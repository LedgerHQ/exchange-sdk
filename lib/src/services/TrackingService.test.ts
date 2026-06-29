import { AnalyticsBrowser } from "@segment/analytics-next";
import { TrackingService } from "./TrackingService";
import { VERSION } from "../version";
import { environmentConfig } from "../config/environment";

const FAKE_SESSION_ID = "session-abc";

function makeBackend(sessionId: string | null = FAKE_SESSION_ID) {
  return {
    getLedgerSessionId: jest.fn().mockResolvedValue(sessionId),
  } as any;
}

describe("TrackingService", () => {
  const mockTrack = jest.fn();
  const mockPage = jest.fn();
  const mockIdentify = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (AnalyticsBrowser.load as jest.Mock).mockReturnValue({
      track: mockTrack,
      page: mockPage,
      identify: mockIdentify,
    });
  });

  it("calls identify with userId on init", async () => {
    const walletAPI = {
      wallet: {
        userId: jest.fn().mockResolvedValue("user-123"),
        info: jest.fn().mockResolvedValue({ tracking: true }),
      },
    } as any;

    new TrackingService({
      walletAPI,
      providerId: "provider-xyz",
      backend: makeBackend(),
    });

    await new Promise((r) => setImmediate(r));

    expect(walletAPI.wallet.userId).toHaveBeenCalled();
    expect(mockIdentify).toHaveBeenCalledWith("user-123");
  });

  it("initializes Segment with the correct write key for environment", () => {
    const walletAPI = {
      wallet: {
        userId: jest.fn().mockResolvedValue("u"),
        info: jest.fn().mockResolvedValue({ tracking: true }),
      },
    } as any;

    new TrackingService({
      walletAPI,
      environment: "production",
      providerId: "provider-xyz",
      backend: makeBackend(),
    });

    expect(AnalyticsBrowser.load).toHaveBeenCalledWith(
      { writeKey: environmentConfig.production.SEGMENT_WRITE_KEY },
      { disableClientPersistence: true },
    );
  });

  it("requests ledger session ID from BackendService on init", () => {
    const walletAPI = {
      wallet: {
        userId: jest.fn().mockResolvedValue("u"),
        info: jest.fn().mockResolvedValue({ tracking: true }),
      },
    } as any;
    const backend = makeBackend();

    new TrackingService({
      walletAPI,
      providerId: "provider-xyz",
      backend,
      providerSessionId: "prov-session-1",
    });

    expect(backend.getLedgerSessionId).toHaveBeenCalledWith("prov-session-1");
  });

  it("trackEvent forwards event with enriched properties and context", async () => {
    mockTrack.mockResolvedValue("ok");
    const walletAPI = {
      wallet: {
        userId: jest.fn().mockResolvedValue("u"),
        info: jest.fn().mockResolvedValue({ tracking: true }),
      },
    } as any;

    const trackingService = new TrackingService({
      walletAPI,
      providerId: "provider-xyz",
      backend: makeBackend(),
    });

    const result = await trackingService.trackEvent("exchange_sdk_initialized", {});

    expect(mockTrack).toHaveBeenCalledWith(
      "exchange_sdk_initialized",
      { providerId: "provider-xyz", ledgerSessionId: FAKE_SESSION_ID },
      { app: { name: "exchange-sdk", version: VERSION } },
    );
    expect(result).toBe("ok");
  });

  it("does not track event if user has opted out", async () => {
    const walletAPI = {
      wallet: {
        userId: jest.fn().mockResolvedValue("u"),
        info: jest.fn().mockResolvedValue({ tracking: false }),
      },
    } as any;

    const trackingService = new TrackingService({
      walletAPI,
      providerId: "provider-xyz",
      backend: makeBackend(),
    });

    const result = await trackingService.trackEvent("exchange_sdk_initialized", {});

    expect(mockTrack).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
