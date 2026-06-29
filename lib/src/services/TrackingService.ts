import type { Context } from "@segment/analytics-next";
import { AnalyticsBrowser } from "@segment/analytics-next";
import { WalletAPIClient } from "@ledgerhq/wallet-api-client";

import { environmentConfig, type Environment } from "../config/environment";
import { eventSchemas, type EventMap } from "../config/events";
import { VERSION } from "../version";
import { BackendService } from "./BackendService";

interface TrackingContext {
  app: {
    name: string;
    version: string;
  };
}

const CONTEXT: TrackingContext = {
  app: {
    name: "exchange-sdk",
    version: VERSION,
  },
};

export class TrackingService {
  private segment: AnalyticsBrowser;
  private walletAPI: WalletAPIClient;
  private providerId: string;
  private optInStatusPromise: Promise<boolean>;
  private ledgerSessionIdPromise: Promise<string | null>;

  constructor({
    walletAPI,
    providerId,
    backend,
    providerSessionId,
    environment = "production",
  }: {
    walletAPI: WalletAPIClient;
    providerId: string;
    backend: BackendService;
    providerSessionId?: string;
    environment?: Environment;
  }) {
    const { SEGMENT_WRITE_KEY } = environmentConfig[environment];

    this.walletAPI = walletAPI;
    this.providerId = providerId;
    this.segment = AnalyticsBrowser.load(
      { writeKey: SEGMENT_WRITE_KEY },
      { disableClientPersistence: true },
    );

    this.ledgerSessionIdPromise = backend.getLedgerSessionId(providerSessionId);
    this.optInStatusPromise = this.fetchOptInStatus();
    this.updateUserId();
  }

  fetchOptInStatus(): Promise<boolean> {
    return this.walletAPI.wallet.info().then((info) => info.tracking);
  }

  private async getLedgerOptInStatus(): Promise<boolean> {
    return this.optInStatusPromise;
  }

  async updateUserId(): Promise<void> {
    const optInStatus = await this.getLedgerOptInStatus();
    if (!optInStatus) return;
    this.walletAPI.wallet.userId().then((userId) => {
      this.segment.identify(userId);
    });
  }

  async trackEvent<K extends keyof EventMap>(
    eventName: K,
    properties: EventMap[K],
  ): Promise<Context | void> {
    const optInStatus = await this.getLedgerOptInStatus();
    if (!optInStatus) return;

    const schema = eventSchemas[eventName];
    if (!schema) {
      console.error(
        `[TrackingService] Invalid event name "${String(eventName)}"`,
      );
      return;
    }

    const result = schema.safeParse(properties);
    if (!result.success) {
      console.error(
        `[TrackingService] Invalid event params for "${String(eventName)}":`,
        result.error.format(),
      );
      return;
    }

    const ledgerSessionId = await this.ledgerSessionIdPromise;
    const enhancedProperties = {
      ...result.data,
      providerId: this.providerId,
      ...(ledgerSessionId !== null && { ledgerSessionId }),
    };

    try {
      return await this.segment.track(eventName, enhancedProperties, CONTEXT);
    } catch (error) {
      console.error("[TrackingService] Error sending event", error);
    }
  }

  async trackPage(
    pageName: string,
    properties: Record<string, any>,
  ): Promise<Context | void> {
    const optInStatus = await this.getLedgerOptInStatus();
    if (!optInStatus) return;

    const ledgerSessionId = await this.ledgerSessionIdPromise;
    const enhancedProperties = {
      ...properties,
      providerId: this.providerId,
      ...(ledgerSessionId !== null && { ledgerSessionId }),
    };

    try {
      return await this.segment.page(pageName, enhancedProperties, CONTEXT);
    } catch (error) {
      console.error("[TrackingService] Error sending page view", error);
    }
  }
}
