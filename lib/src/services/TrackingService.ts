import {
  TrackingSdkFactory,
  TrackingSdk,
  TrackingContext,
} from "@ledgerhq/tracking-sdk";
import { WalletAPIClient } from "@ledgerhq/wallet-api-client";

import { VERSION } from "../version";

const CONTEXT: TrackingContext = {
  app: {
    name: "exchange-sdk",
    version: VERSION,
  },
};

type CreateTrackingServiceParams = {
  walletAPI: WalletAPIClient;
  providerId: string;
  environment?: "staging" | "preproduction" | "production";
  providerSessionId?: string;
};

export const createTrackingService = ({
  walletAPI,
  providerId,
  environment,
  providerSessionId,
}: CreateTrackingServiceParams) => {
  const client: TrackingSdk = TrackingSdkFactory.getInstance({
    environment,
    providerSessionId,
  });

  const optInStatusPromise: Promise<boolean> = walletAPI.wallet
    .info()
    .then((info) => info.tracking);

  const getLedgerOptInStatus = async (): Promise<boolean> => {
    return optInStatusPromise;
  };

  const updateUserId = async (): Promise<void> => {
    const optInStatus = await getLedgerOptInStatus();

    if (!optInStatus) {
      return;
    }

    walletAPI.wallet.userId().then((userId) => {
      client.identify(userId);
    });
  };

  const trackEvent = async (
    eventName: Parameters<TrackingSdk["trackEvent"]>[0],
    properties: Parameters<TrackingSdk["trackEvent"]>[1],
  ): ReturnType<TrackingSdk["trackEvent"]> => {
    const optInStatus = await getLedgerOptInStatus();

    if (!optInStatus) {
      return;
    }

    const enhancedProperties = {
      ...properties,
      providerId,
    };
    return client.trackEvent(eventName, enhancedProperties, CONTEXT);
  };

  const trackPage = async (
    pageName: Parameters<TrackingSdk["trackPage"]>[0],
    properties: Parameters<TrackingSdk["trackPage"]>[1],
  ): ReturnType<TrackingSdk["trackPage"]> => {
    const optInStatus = await getLedgerOptInStatus();

    if (!optInStatus) {
      return;
    }

    const enhancedProperties = {
      ...properties,
      providerId: providerId,
    };
    return client.trackPage(pageName, enhancedProperties, CONTEXT);
  };

  void updateUserId();

  return {
    client,
    trackEvent,
    trackPage,
    updateUserId,
  };
};
