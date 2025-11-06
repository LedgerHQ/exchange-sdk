import * as firebaseApp from "firebase/app";
import * as firebaseRC from "firebase/remote-config";

import { createRemoteConfigManager } from "./remote";

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
}));

jest.mock("firebase/remote-config", () => ({
  getRemoteConfig: jest.fn(),
  fetchAndActivate: jest.fn(),
  getAll: jest.fn(),
  getValue: jest.fn(),
}));

describe("createRemoteConfigManager", () => {
  const fakeConfig = {
    apiKey: "apiKey",
    authDomain: "authDomain",
    projectId: "projectId",
    storageBucket: "storageBucket",
    messagingSenderId: "messagingSenderId",
    appId: "appId",
    minimumFetchIntervalMillis: 1234,
  };

  let mockApp: any;
  let mockRemoteConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockApp = {};
    mockRemoteConfig = { settings: {} };

    (firebaseApp.initializeApp as jest.Mock).mockReturnValue(mockApp);
    (firebaseRC.getRemoteConfig as jest.Mock).mockReturnValue(mockRemoteConfig);
    (firebaseRC.fetchAndActivate as jest.Mock).mockResolvedValue(true);
    (firebaseRC.getValue as jest.Mock).mockImplementation((rc, key) => key);
    (firebaseRC.getAll as jest.Mock).mockReturnValue({ foo: "bar" });
  });

  it("initializes firebase with config", async () => {
    await createRemoteConfigManager(fakeConfig);

    expect(firebaseApp.initializeApp).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "apiKey",
        authDomain: "authDomain",
        projectId: "projectId",
        storageBucket: "storageBucket",
        messagingSenderId: "messagingSenderId",
        appId: "appId",
      })
    );
  });

  it("sets minimumFetchIntervalMillis on remote config", async () => {
    await createRemoteConfigManager(fakeConfig);
    expect(mockRemoteConfig.settings.minimumFetchIntervalMillis).toBe(1234);
  });

  it("calls fetchAndActivate", async () => {
    await createRemoteConfigManager(fakeConfig);
    expect(firebaseRC.fetchAndActivate).toHaveBeenCalledWith(mockRemoteConfig);
  });

  it("returns object with getFlag and getAllFlags", async () => {
    const manager = await createRemoteConfigManager(fakeConfig);
    expect(manager.getFlag).toBeDefined();
    expect(manager.getAllFlags).toBeDefined();

    // calling the returned methods delegates to mocks
    expect(firebaseRC.getValue).not.toHaveBeenCalled();
    manager.getFlag("test-key");
    expect(firebaseRC.getValue).toHaveBeenCalledWith(
      mockRemoteConfig,
      "test-key"
    );

    expect(manager.getAllFlags()).toEqual({ foo: "bar" });
  });

  it("defaults minimumFetchIntervalMillis to 0 if not provided", async () => {
    const { minimumFetchIntervalMillis: _, ...configWithoutInterval } =
      fakeConfig;
    await createRemoteConfigManager(configWithoutInterval as any);
    expect(mockRemoteConfig.settings.minimumFetchIntervalMillis).toBe(0);
  });
});
