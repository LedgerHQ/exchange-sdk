import { Context } from '@segment/analytics-next';
import { z } from 'zod';

declare const eventSchemas: {
    asset_clicked: z.ZodObject<{
        ledgerSessionId: z.ZodString;
        page: z.ZodString;
        flow: z.ZodEnum<{
            buy: "buy";
            sell: "sell";
        }>;
        currency: z.ZodString;
        live_app: z.ZodString;
        anonymised_url: z.ZodURL;
    }, z.core.$strip>;
    quote_requested: z.ZodObject<{
        ledgerSessionId: z.ZodString;
        amount: z.ZodNumber;
        currency: z.ZodString;
    }, z.core.$strip>;
};
type EventMap = {
    [K in keyof typeof eventSchemas]: z.infer<(typeof eventSchemas)[K]>;
};

type Environment = "staging" | "production";
interface SDKConfig {
    environment: Environment;
    providerSessionId?: string;
}
interface TrackingContext {
    app: {
        name: string;
        version: string;
    };
}

/**
 * Tracking is per session so we create one instance at runtime
 * this will prevent issues where the client may instantiate multiple times
 * and we end up calling BE services more often than we would like
 */
declare class TrackingSdkFactory {
    private static instance;
    static getInstance(config: SDKConfig): TrackingSdk;
    static resetInstance(): void;
}
declare class TrackingSdk {
    private strategyPromise;
    private sdkConfig;
    constructor(sdkConfig: SDKConfig);
    private fetchTrackingStrategy;
    private getStrategy;
    trackEvent<K extends keyof EventMap>(eventName: K, props: EventMap[K], context?: TrackingContext): Promise<Context | void>;
    identify(userId: string): Promise<Context | void>;
}

export { TrackingSdkFactory };
