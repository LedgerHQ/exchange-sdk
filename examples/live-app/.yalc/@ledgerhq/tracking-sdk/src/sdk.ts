import type { Context } from "@segment/analytics-next";

import { environmentConfig } from "./config/environment";
import type { EventMap } from "./config/events";
import { eventSchemas } from "./config/events";
import { createRemoteConfigManager } from "./config/remote";
import type { TrackingStrategy, SDKConfig, TrackingContext } from "./sdk.types";
import { BackendTracking } from "./services/BackendTracking";
import { FrontendTracking } from "./services/FrontendTracking";

/**
 * Tracking is per session so we create one instance at runtime
 * this will prevent issues where the client may instantiate multiple times
 * and we end up calling BE services more often than we would like
 */
export class TrackingSdkFactory {
  private static instance: TrackingSdk | null = null;

  static getInstance(config: SDKConfig): TrackingSdk {
    if (!this.instance) {
      this.instance = new TrackingSdk(config);
    }
    return this.instance;
  }

  static resetInstance() {
    this.instance = null;
  }
}

class TrackingSdk {
  private strategyPromise: Promise<TrackingStrategy>;
  private sdkConfig: SDKConfig;

  constructor(sdkConfig: SDKConfig) {
    this.sdkConfig = sdkConfig;
    this.strategyPromise = this.fetchTrackingStrategy();
  }

  private async fetchTrackingStrategy(): Promise<TrackingStrategy> {
    const config = environmentConfig[this.sdkConfig.environment];
    const remoteConfigManager = await createRemoteConfigManager({
      apiKey: config.FIREBASE_API_KEY,
      authDomain: config.FIREBASE_AUTH_DOMAIN,
      projectId: config.FIREBASE_PROJECT_ID,
      storageBucket: config.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
      appId: config.FIREBASE_APP_ID,
      minimumFetchIntervalMillis: config.FIREBASE_MIN_FETCH_INTERVAL_MS,
    });

    const strategyConfig = await remoteConfigManager.getFlag(
      "feature_tracking_strategy"
    );
    const value = JSON.parse(strategyConfig.asString());

    return value.enabled && value.params.strategy === "phase2"
      ? new BackendTracking(this.sdkConfig)
      : new FrontendTracking(this.sdkConfig);
  }

  private async getStrategy(): Promise<TrackingStrategy> {
    return this.strategyPromise;
  }

  async trackEvent<K extends keyof EventMap>(
    eventName: K,
    props: EventMap[K],
    context?: TrackingContext
  ): Promise<Context | void> {
    const schema = eventSchemas[eventName];

    if (!schema) {
      console.error(`[TrackingSDK] Invalid event name "${String(eventName)}"`);
      return;
    }

    const result = schema.safeParse(props);

    if (!result.success) {
      console.error(
        `[TrackingSDK] Invalid event params for event "${String(eventName)}":`,
        result.error.format()
      );
      return;
    }

    const strategy = await this.getStrategy();

    try {
      return strategy.trackEvent(eventName, props, context);
    } catch (error) {
      console.error("[TrackingSDK] Error sending event", error);
    }
  }

  async identify(userId: string): Promise<Context | void> {
    const strategy = await this.getStrategy();
    try {
      return strategy.identify(userId);
    } catch (error) {
      console.error("[TrackingSDK] Error sending identify", error);
    }
  }
}
