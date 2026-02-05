import { TrackingSdkFactory } from "@ledgerhq/tracking-sdk";
import { createTrackingService } from "./TrackingService";
import { VERSION } from "../version";

describe("TrackingService", () => {
  const mockIdentify = jest.fn();
  const mockTrackEvent = jest.fn();

  const fakeClient = {
    identify: mockIdentify,
    trackEvent: mockTrackEvent,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // TrackingSdkFactory is mocked in jest.setup.ts
    (TrackingSdkFactory as any).getInstance.mockReturnValue(fakeClient);
  });

  it("initializes client and calls identify with userId", async () => {
    const walletAPI = {
      wallet: {
        userId: jest.fn().mockResolvedValue("user-123"),
        info: jest.fn().mockResolvedValue({ tracking: true }),
      },
    } as any;

    const trackingService = createTrackingService({
      walletAPI,
      providerId: "provider-xyz",
    });

    expect((TrackingSdkFactory as any).getInstance).toHaveBeenCalled();

    // wait for the async updateUserId side-effect
    await new Promise((r) => setImmediate(r));

    expect(walletAPI.wallet.info).toHaveBeenCalled();
    expect(walletAPI.wallet.userId).toHaveBeenCalled();
    expect(mockIdentify).toHaveBeenCalledWith("user-123");
    expect(trackingService.client).toBe(fakeClient);
  });

  it("initializes client with provided environment", () => {
    const walletAPI = {
      wallet: {
        userId: jest.fn().mockResolvedValue("u"),
        info: jest.fn().mockResolvedValue({ tracking: true }),
      },
    } as any;

    createTrackingService({
      walletAPI,
      environment: "production",
      providerId: "provider-xyz",
    });

    expect((TrackingSdkFactory as any).getInstance).toHaveBeenCalledWith({
      environment: "production",
      providerSessionId: undefined,
    });
  });

  it("trackEvent forwards event, properties and context and returns client's result", async () => {
    mockTrackEvent.mockReturnValue("ok");

    const walletAPI = {
      wallet: {
        userId: jest.fn().mockResolvedValue("u"),
        info: jest.fn().mockResolvedValue({ tracking: true }),
      },
    } as any;

    const trackingService = createTrackingService({
      walletAPI,
      providerId: "provider-xyz",
    });

    // @ts-expect-error event name or params do not matter for this test
    const result = await trackingService.trackEvent("my-event", { a: 1 });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "my-event",
      { a: 1, providerId: "provider-xyz" },
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

    const trackingService = createTrackingService({
      walletAPI,
      providerId: "provider-xyz",
    });

    // @ts-expect-error event name or params do not matter for this test
    const result = await trackingService.trackEvent("my-event", { a: 1 });

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
