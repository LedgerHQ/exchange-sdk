import { TrackingSdkFactory } from "@ledgerhq/tracking-sdk";
import { TrackingService } from "./TrackingService";
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

  it("initializes client with default environment and calls identify with userId", async () => {
    const walletAPI = {
      wallet: {
        userId: jest.fn().mockResolvedValue("user-123"),
      },
    } as any;

    const trackingService = new TrackingService({ walletAPI });

    expect((TrackingSdkFactory as any).getInstance).toHaveBeenCalledWith({
      environment: "staging",
    });

    // wait for the promise in updateUserId to resolve
    await new Promise((r) => setImmediate(r));

    expect(walletAPI.wallet.userId).toHaveBeenCalled();
    expect(mockIdentify).toHaveBeenCalledWith("user-123");
    expect(trackingService.client).toBe(fakeClient);
  });

  it("initializes client with provided environment", async () => {
    const walletAPI = {
      wallet: {
        userId: jest.fn().mockResolvedValue("u"),
      },
    } as any;

    new TrackingService({ walletAPI, environment: "production" });

    expect((TrackingSdkFactory as any).getInstance).toHaveBeenCalledWith({
      environment: "production",
    });
  });

  it("trackEvent forwards event, properties and context and returns client's result", () => {
    mockTrackEvent.mockReturnValue("ok");
    const walletAPI = {
      wallet: {
        userId: jest.fn().mockResolvedValue("u"),
      },
    } as any;

    const trackingService = new TrackingService({ walletAPI });
    // @ts-expect-error event name or params do not matter for this test
    const result = trackingService.trackEvent("my-event", { a: 1 });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "my-event",
      { a: 1 },
      { app: { name: "exchange-sdk", version: VERSION } },
    );
    expect(result).toBe("ok");
  });
});
