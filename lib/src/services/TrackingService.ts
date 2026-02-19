import {
  TrackingSdkFactory,
  TrackingSdk,
  TrackingContext,
} from "@ledgerhq/tracking-sdk";
import { WalletAPIClient } from "@ledgerhq/wallet-api-client";

import { VERSION } from "../version";

type TrackEventFn = TrackingSdk["trackEvent"];
type TrackPageFn = TrackingSdk["trackPage"];

export type TrackEvent = Parameters<TrackEventFn>[0];
export type TrackEventProperties = Parameters<TrackEventFn>[1];
export type TrackPage = Parameters<TrackPageFn>[0];
export type TrackPageProperties = Parameters<TrackPageFn>[1];

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
    providerSessionId,
  }: {
    walletAPI: WalletAPIClient;
    providerId: string;
    environment?: "staging" | "preproduction" | "production";
    providerSessionId?: string;
  }) {
    this.walletAPI = walletAPI;
    this.providerId = providerId;
    this.client = TrackingSdkFactory.getInstance({
      environment,
      providerSessionId,
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
    eventName: TrackEvent,
    properties: TrackEventProperties,
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

  async trackPage(
    pageName: TrackPage,
    properties: TrackPageProperties,
  ): ReturnType<TrackingSdk["trackPage"]> {
    const optInStatus = await this.getLedgerOptInStatus();

    if (!optInStatus) {
      return;
    }

    const enhancedProperties = {
      ...properties,
      providerId: this.providerId,
    };
    return this.client.trackPage(pageName, enhancedProperties, CONTEXT);
  }
}
