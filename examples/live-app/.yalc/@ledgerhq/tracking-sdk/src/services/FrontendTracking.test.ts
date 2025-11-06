import { AnalyticsBrowser } from "@segment/analytics-next";

import { FrontendTracking } from "./FrontendTracking";

const mockSegmentTrack = jest.fn();
const mockSegmentIdentify = jest.fn();

jest.mock("@segment/analytics-next", () => ({
  AnalyticsBrowser: {
    load: jest.fn(() => ({
      track: mockSegmentTrack,
      identify: mockSegmentIdentify,
    })),
  },
}));

jest.mock("../config/environment", () => ({
  environmentConfig: {
    staging: { SEGMENT_WRITE_KEY: "staging-key" },
    production: { SEGMENT_WRITE_KEY: "prod-key" },
  },
}));

const getLedgerSessionIdMock = jest.fn().mockResolvedValue("mock-session-id");

jest.mock("./BackendApi", () => ({
  BackendApiService: jest.fn().mockImplementation(() => ({
    getLedgerSessionId: getLedgerSessionIdMock,
  })),
}));

describe("FrontendTracking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes AnalyticsBrowser with correct write key", () => {
    new FrontendTracking({
      environment: "staging",
    });

    expect(AnalyticsBrowser.load).toHaveBeenCalledWith(
      { writeKey: "staging-key" },
      { disableClientPersistence: true }
    );
  });

  it("calls backendApi.getLedgerSessionId once during initialization", async () => {
    new FrontendTracking({
      environment: "staging",
    });

    expect(getLedgerSessionIdMock).toHaveBeenCalledTimes(1);
  });

  describe("trackEvent", () => {
    it("should add the ledgerSessionId to the params it forwards onto segment", async () => {
      const tracking = new FrontendTracking({
        environment: "staging",
      });

      await tracking.trackEvent(
        "asset_clicked",
        // @ts-expect-error
        { param: "one" },
        { app: { name: "jest", version: "1" } }
      );

      expect(mockSegmentTrack).toHaveBeenCalledWith(
        "asset_clicked",
        {
          param: "one",
          ledgerSessionId: "mock-session-id",
        },
        { app: { name: "jest", version: "1" } }
      );
    });
  });

  describe("identify", () => {
    it("should add the ledgerSessionId to the params it forwards onto segment", async () => {
      const tracking = new FrontendTracking({
        environment: "staging",
      });

      await tracking.identify("xxx-xxx-xxx");

      expect(mockSegmentIdentify).toHaveBeenCalledWith("xxx-xxx-xxx");
    });
  });
});
