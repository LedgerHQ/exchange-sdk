import type { Context } from "@segment/analytics-next";

import type { EventMap } from "../config/events";
import type {
  TrackingStrategy,
  SDKConfig,
  TrackingContext,
} from "../sdk.types";

export class BackendTracking implements TrackingStrategy {
  constructor(config: SDKConfig) {
    console.log("Initialized BackendTracking with config:", config);
  }

  async trackEvent<K extends keyof EventMap>(
    eventName: K,
    params: EventMap[K],
    context?: TrackingContext
  ): Promise<Context | void> {
    console.log(
      "Sending event via BackendTracking:",
      eventName,
      params,
      context
    );
  }

  async identify(userId: string) {
    console.log("Sending identify via BackendTracking", userId);
  }
}
