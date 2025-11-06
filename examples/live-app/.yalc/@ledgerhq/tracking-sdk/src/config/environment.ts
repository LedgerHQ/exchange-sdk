import type { Environment } from "../sdk.types";

export interface EnvironmentConfig {
  BUY_API_URL: string;
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  SEGMENT_WRITE_KEY: string;
  FIREBASE_MIN_FETCH_INTERVAL_MS?: number;
}

export const environmentConfig: Record<Environment, EnvironmentConfig> = {
  staging: {
    BUY_API_URL: "https://buy.api.live.ppr.ledger-test.com",
    FIREBASE_API_KEY: "AIzaSyAIAfZg0OiTitWI8VhC5EAteiG55YV58aI",
    FIREBASE_AUTH_DOMAIN: "buy-sell-live-app-staging.firebaseapp.com",
    FIREBASE_PROJECT_ID: "buy-sell-live-app-staging",
    FIREBASE_STORAGE_BUCKET: "buy-sell-live-app-staging.appspot.com",
    FIREBASE_MESSAGING_SENDER_ID: "996080982816",
    FIREBASE_APP_ID: "1:996080982816:web:fe9b2f6d848cc66ec49545",
    SEGMENT_WRITE_KEY: "1IEy9yPIYksh4yrYeKvYciLgXS9HJDbA",
    FIREBASE_MIN_FETCH_INTERVAL_MS: 0,
  },
  production: {
    BUY_API_URL: "https://buy.api.live.ledger.com",
    FIREBASE_API_KEY: "AIzaSyAIAfZg0OiTitWI8VhC5EAteiG55YV58aI",
    FIREBASE_AUTH_DOMAIN: "buy-sell-live-app-staging.firebaseapp.com",
    FIREBASE_PROJECT_ID: "buy-sell-live-app-staging",
    FIREBASE_STORAGE_BUCKET: "buy-sell-live-app-staging.appspot.com",
    FIREBASE_MESSAGING_SENDER_ID: "996080982816",
    FIREBASE_APP_ID: "1:996080982816:web:fe9b2f6d848cc66ec49545",
    SEGMENT_WRITE_KEY: "STAGING_SEGMENT_WRITE_KEY",
    FIREBASE_MIN_FETCH_INTERVAL_MS: 7200000, // 2 hours
  },
};
