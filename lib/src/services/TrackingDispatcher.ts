import { WalletAPIClient } from "@ledgerhq/wallet-api-client";
import { createSaveToStorageService } from "./SaveToStorage";
import {
  TrackingService,
  TrackEvent,
  TrackEventProperties,
  TrackPage,
  TrackPageProperties,
} from "./TrackingService";

export const createTrackingDispatcher = ({
  walletAPI,
  providerId,
  environment,
  providerSessionId,
}: {
  walletAPI: WalletAPIClient;
  providerId: string;
  environment?: "staging" | "preproduction" | "production";
  providerSessionId?: string;
}) => {
  const tracking = new TrackingService({
    walletAPI,
    providerId,
    environment,
    providerSessionId,
  });

  const saveToStorage = createSaveToStorageService({ providerId, walletAPI });

  const trackPage = async (
    page: TrackPage,
    props: TrackPageProperties = {},
  ) => {
    await tracking.trackPage(page, props);
    saveToStorage.saveToStorage("page_view", page);
  };

  const trackEvent = async (event: TrackEvent, props: TrackEventProperties) => {
    await tracking.trackEvent(event, props);
    saveToStorage.saveToStorage("event", event);
  };

  return {
    trackPage,
    trackEvent,
  };
};
