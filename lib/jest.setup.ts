jest.mock("@segment/analytics-next", () => ({
  AnalyticsBrowser: {
    load: jest.fn(() => ({
      track: jest.fn(),
      page: jest.fn(),
      identify: jest.fn(),
    })),
  },
}));
