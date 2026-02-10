import { createSaveToStorageService } from "./SaveToStorage";

const STORAGE_NAMESPACE = "v4_card_integration_state";

const mockWalletAPI = {
  storage: {
    get: jest.fn() as jest.Mock,
    set: jest.fn() as jest.Mock,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createSaveToStorageService.saveToStorage", () => {
  it("does nothing when the event type has no mapping", async () => {
    const { saveToStorage } = createSaveToStorageService({
      providerId: "baanx",
      // @ts-expect-error
      walletAPI: mockWalletAPI,
    });

    mockWalletAPI.storage.get.mockResolvedValue(null);

    await saveToStorage("page_view", "unknown_page");

    expect(mockWalletAPI.storage.set).not.toHaveBeenCalled();
  });

  it("does nothing when event exists but providerId does not match", async () => {
    const { saveToStorage } = createSaveToStorageService({
      providerId: "not-baanx", // mismatched provider
      // @ts-expect-error
      walletAPI: mockWalletAPI,
    });

    mockWalletAPI.storage.get.mockResolvedValue(null);

    await saveToStorage("page_view", "confirm_your_email");

    expect(mockWalletAPI.storage.set).not.toHaveBeenCalled();
  });

  it("creates new storage entry when flag is updated for first time", async () => {
    const { saveToStorage } = createSaveToStorageService({
      providerId: "baanx",
      // @ts-expect-error
      walletAPI: mockWalletAPI,
    });

    mockWalletAPI.storage.get.mockResolvedValue(null);

    const before = Date.now();
    await saveToStorage("page_view", "confirm_your_email");
    const after = Date.now();

    expect(mockWalletAPI.storage.set).toHaveBeenCalledTimes(1);

    const [namespace, savedValue] = mockWalletAPI.storage.set.mock.calls[0];
    expect(namespace).toBe(STORAGE_NAMESPACE);

    const parsed = JSON.parse(savedValue);
    expect(parsed.baanx).toBeDefined();
    expect(parsed.baanx.flags.onboarding_started).toBe(true);

    // timestamp should be present and within reasonable bounds
    const timestamp = new Date(parsed.baanx.last_updated_at).getTime();
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it("merges with existing stored provider state", async () => {
    const existingState = {
      baanx: {
        flags: {
          onboarding_started: true,
        },
        last_updated_at: "2025-01-01T00:00:00.000Z",
      },
    };

    mockWalletAPI.storage.get.mockResolvedValue(JSON.stringify(existingState));

    const { saveToStorage } = createSaveToStorageService({
      providerId: "baanx",
      // @ts-expect-error
      walletAPI: mockWalletAPI,
    });

    await saveToStorage("page_view", "order_your_card");

    expect(mockWalletAPI.storage.set).toHaveBeenCalled();

    const parsed = JSON.parse(mockWalletAPI.storage.set.mock.calls[0][1]);

    // Old flag preserved
    expect(parsed.baanx.flags.onboarding_started).toBe(true);

    // New flag added
    expect(parsed.baanx.flags.onboarding_completed).toBe(true);

    // timestamp updated
    expect(parsed.baanx.last_updated_at).not.toBe(
      existingState.baanx.last_updated_at,
    );
  });

  it("handles event mappings (not only page_view)", async () => {
    mockWalletAPI.storage.get.mockResolvedValue(null);

    const { saveToStorage } = createSaveToStorageService({
      providerId: "baanx",
      // @ts-expect-error
      walletAPI: mockWalletAPI,
    });

    await saveToStorage("event", "topup_completed");

    const saved = JSON.parse(mockWalletAPI.storage.set.mock.calls[0][1]);

    expect(saved.baanx.flags.funded_card).toBe(true);
  });
});
