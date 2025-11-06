import { createRemoteConfigManager } from "./config/remote";
import { TrackingSdkFactory } from "./sdk";
import { BackendTracking } from "./services/BackendTracking";
import { FrontendTracking } from "./services/FrontendTracking";

jest.mock("./services/FrontendTracking", () => ({
  FrontendTracking: jest.fn().mockImplementation(() => ({
    type: "frontend",
    trackEvent: jest.fn(),
    identify: jest.fn(),
  })),
}));

jest.mock("./services/BackendTracking", () => ({
  BackendTracking: jest.fn().mockImplementation(() => ({ type: "backend" })),
}));

jest.mock("./config/remote", () => ({
  createRemoteConfigManager: jest.fn(),
}));

function setupMockGetFlag({
  enabled,
  strategy,
}: {
  enabled: boolean;
  strategy: "phase1" | "phase2";
}) {
  const mockGetFlag = jest.fn().mockResolvedValue({
    asString: () =>
      JSON.stringify({
        enabled,
        params: { strategy },
      }),
  });

  (createRemoteConfigManager as jest.Mock).mockResolvedValue({
    getFlag: mockGetFlag,
  });
}

jest.mock("./config/environment", () => ({
  environmentConfig: {
    staging: {
      FIREBASE_API_KEY: "apiKey",
      FIREBASE_AUTH_DOMAIN: "authDomain",
      FIREBASE_PROJECT_ID: "projectId",
      FIREBASE_STORAGE_BUCKET: "storageBucket",
      FIREBASE_MESSAGING_SENDER_ID: "messagingSenderId",
      FIREBASE_APP_ID: "appId",
      FIREBASE_MIN_FETCH_INTERVAL_MS: 1000,
    },
  },
}));

describe("TrackingSdkFactory & TrackingSdk", () => {
  const config = { environment: "staging" };

  beforeEach(() => {
    jest.clearAllMocks();
    TrackingSdkFactory.resetInstance();
  });

  it("returns the same instance for multiple calls", () => {
    setupMockGetFlag({
      enabled: true,
      strategy: "phase1",
    });

    const instance1 = TrackingSdkFactory.getInstance(config as any);
    const instance2 = TrackingSdkFactory.getInstance(config as any);

    expect(instance1).toBe(instance2);
  });

  it("creates FrontendTracking if remote config flag is false", async () => {
    setupMockGetFlag({
      enabled: true,
      strategy: "phase1",
    });

    const sdk = TrackingSdkFactory.getInstance(config as any);
    const strategy: any = await (sdk as any)["getStrategy"]();

    expect(strategy.type).toBe("frontend");
    expect(FrontendTracking).toHaveBeenCalledWith(config);
  });

  it("creates BackendTracking if remote config flag enables phase2", async () => {
    setupMockGetFlag({
      enabled: true,
      strategy: "phase2",
    });

    const sdk = TrackingSdkFactory.getInstance(config as any);
    const strategy: any = await (sdk as any).getStrategy();

    expect(strategy.type).toBe("backend");
    expect(BackendTracking).toHaveBeenCalledWith(config);
  });

  describe("trackEvent", () => {
    beforeEach(() => {
      setupMockGetFlag({
        enabled: true,
        strategy: "phase1",
      });
    });

    it("calls strategy trackEvent if the event data is valid", async () => {
      const sdk = TrackingSdkFactory.getInstance(config as any);
      const strategy: any = await (sdk as any).getStrategy();
      const eventParams = {
        ledgerSessionId: "xxx-xxx",
        amount: 500,
        currency: "eth",
      };
      const context = { app: { name: "jest", version: "1" } };

      await sdk.trackEvent("quote_requested", eventParams, context);

      expect(strategy.trackEvent).toHaveBeenCalledWith(
        "quote_requested",
        eventParams,
        context
      );
    });

    it("does not call strategy trackEvent if the event name is not valid", async () => {
      const sdk = TrackingSdkFactory.getInstance(config as any);
      const strategy: any = await (sdk as any).getStrategy();
      const eventParams = {
        ledgerSessionId: "xxx-xxx",
        amount: 500,
        currency: "eth",
      };

      // @ts-expect-error
      await sdk.trackEvent("invalid_name", eventParams);

      expect(strategy.trackEvent).not.toHaveBeenCalled();
    });

    it("does not call strategy trackEvent if the event params are not valid", async () => {
      const sdk = TrackingSdkFactory.getInstance(config as any);
      const strategy: any = await (sdk as any).getStrategy();

      // @ts-expect-error
      await sdk.trackEvent("quote_requested", { invalid: "params" });

      expect(strategy.trackEvent).not.toHaveBeenCalled();
    });
  });

  describe("identify", () => {
    it("calls strategy identify with the user id", async () => {
      const sdk = TrackingSdkFactory.getInstance(config as any);
      const strategy: any = await (sdk as any).getStrategy();

      await sdk.identify("yyyy-yyyy-yyyy");

      expect(strategy.identify).toHaveBeenCalledWith("yyyy-yyyy-yyyy");
    });

    it("logs an error but does not throw if identify fails", async () => {
      setupMockGetFlag({
        enabled: true,
        strategy: "phase1",
      });

      const sdk = TrackingSdkFactory.getInstance(config as any);
      const strategy: any = await (sdk as any).getStrategy();

      const error = new Error("identify failed");
      (strategy.identify as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(sdk.identify("user-123")).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[TrackingSDK] Error sending identify",
        error
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
