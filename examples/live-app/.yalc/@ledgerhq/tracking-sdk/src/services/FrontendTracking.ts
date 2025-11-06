import type { Context } from "@segment/analytics-next";
import { AnalyticsBrowser } from "@segment/analytics-next";

import { BackendApiService } from "./BackendApi";
import { environmentConfig } from "../config/environment";
import type { EventMap } from "../config/events";
import type {
  TrackingStrategy,
  SDKConfig,
  TrackingContext,
} from "../sdk.types";

export class FrontendTracking implements TrackingStrategy {
  private segment: AnalyticsBrowser;
  private backendApi: BackendApiService;
  private ledgerSessionIdPromise: Promise<string | null>;

  constructor(config: SDKConfig) {
    console.log("Initialized FrontendTracking with config:", config);

    const { SEGMENT_WRITE_KEY } = environmentConfig[config.environment];

    this.backendApi = new BackendApiService(config);
    this.segment = AnalyticsBrowser.load(
      { writeKey: SEGMENT_WRITE_KEY },
      {
        disableClientPersistence: true,
      }
    );

    this.ledgerSessionIdPromise = this.fetchLedgerSessionId();
  }

  private async fetchLedgerSessionId(): Promise<string | null> {
    return (this.ledgerSessionIdPromise = this.backendApi
      .getLedgerSessionId()
      .catch((err) => {
        console.error("Failed to get ledgerSessionId:", err);
        return null;
      }));
  }

  private async getLedgerSessionId(): Promise<string | null> {
    return this.ledgerSessionIdPromise;
  }

  async trackEvent<K extends keyof EventMap>(
    eventName: K,
    params: EventMap[K],
    context?: TrackingContext
  ): Promise<Context | void> {
    const ledgerSessionId = await this.getLedgerSessionId();

    return this.segment.track(
      eventName,
      { ...params, ledgerSessionId },
      context
    );
  }

  async identify(userId: string) {
    return this.segment.identify(userId);
  }
}
