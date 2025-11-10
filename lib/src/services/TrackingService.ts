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
export class TrackingService {
  public client: TrackingSdk;

  private walletAPI: WalletAPIClient;

  constructor({
    walletAPI,
    environment = "staging",
  }: {
    walletAPI: WalletAPIClient;
    environment?: "staging" | "preproduction" | "production";
  }) {
    this.walletAPI = walletAPI;
    this.client = TrackingSdkFactory.getInstance({
      environment,
    });
    this.updateUserId();
  }

  updateUserId() {
    this.walletAPI.wallet.userId().then((userId) => {
      this.client.identify(userId);
    });
  }

  trackEvent(
    eventName: Parameters<TrackingSdk["trackEvent"]>[0],
    properties: Parameters<TrackingSdk["trackEvent"]>[1],
  ): ReturnType<TrackingSdk["trackEvent"]> {
    return this.client.trackEvent(eventName, properties, CONTEXT);
  }
}
