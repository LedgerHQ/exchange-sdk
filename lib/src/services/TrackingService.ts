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
  private providerId: string;
  private optInStatusPromise: Promise<boolean>;

  constructor({
    walletAPI,
    providerId,
    environment,
  }: {
    walletAPI: WalletAPIClient;
    providerId: string;
    environment?: "staging" | "preproduction" | "production";
  }) {
    this.walletAPI = walletAPI;
    this.providerId = providerId;
    this.client = TrackingSdkFactory.getInstance({
      environment,
    });
    this.optInStatusPromise = this.fetchOptInStatus();
    this.updateUserId();
  }

  fetchOptInStatus() {
    return this.walletAPI.wallet.info().then((info) => info.tracking);
  }

  private async getLedgerOptInStatus(): Promise<boolean> {
    return this.optInStatusPromise;
  }

  async updateUserId() {
    const optInStatus = await this.getLedgerOptInStatus();

    if (!optInStatus) {
      return;
    }

    this.walletAPI.wallet.userId().then((userId) => {
      this.client.identify(userId);
    });
  }

  async trackEvent(
    eventName: Parameters<TrackingSdk["trackEvent"]>[0],
    properties: Parameters<TrackingSdk["trackEvent"]>[1],
  ): ReturnType<TrackingSdk["trackEvent"]> {
    const optInStatus = await this.getLedgerOptInStatus();

    if (!optInStatus) {
      return;
    }

    const enhancedProperties = {
      ...properties,
      providerId: this.providerId,
    };
    return this.client.trackEvent(eventName, enhancedProperties, CONTEXT);
  }
}
