import { initializeApp } from "firebase/app";
import {
  fetchAndActivate,
  getAll,
  getValue,
  getRemoteConfig,
} from "firebase/remote-config";

export async function createRemoteConfigManager({
  minimumFetchIntervalMillis,
  ...config
}: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  minimumFetchIntervalMillis?: number;
}) {
  const app = await initializeApp(config);
  const remoteConfig = getRemoteConfig(app);

  remoteConfig.settings.minimumFetchIntervalMillis =
    minimumFetchIntervalMillis ?? 0;

  await fetchAndActivate(remoteConfig);

  return {
    getFlag: (key: string) => getValue(remoteConfig, key),
    getAllFlags: () => getAll(remoteConfig),
  };
}
