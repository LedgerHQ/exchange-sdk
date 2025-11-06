import type { Context } from "@segment/analytics-next";

import type { EventMap } from "./config/events";

export type Environment = "staging" | "production";

export interface SDKConfig {
  environment: Environment;
  providerSessionId?: string;
}

export interface TrackingStrategy {
  identify(userId: string): Promise<Context | void>;
  trackEvent<K extends keyof EventMap>(
    eventName: K,
    params: EventMap[K],
    context?: TrackingContext
  ): Promise<Context | void>;
}

export interface TrackingContext {
  app: {
    name: string;
    version: string;
  };
}
