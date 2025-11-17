jest.mock("@ledgerhq/tracking-sdk", () => ({
  TrackingSdkFactory: {
    getInstance: jest.fn(() => ({
      identify: jest.fn(),
      trackEvent: jest.fn(),
    })),
  },
}));
