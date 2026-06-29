export type Environment = "staging" | "preproduction" | "production";

export interface EnvironmentConfig {
  BUY_API_URL: string;
  SEGMENT_WRITE_KEY: string;
}

export const environmentConfig: Record<Environment, EnvironmentConfig> = {
  staging: {
    BUY_API_URL: "https://buy.api.aws.stg.ldg-tech.com",
    SEGMENT_WRITE_KEY: "1IEy9yPIYksh4yrYeKvYciLgXS9HJDbA",
  },
  preproduction: {
    BUY_API_URL: "https://buy.api.live.ppr.ledger-test.com",
    SEGMENT_WRITE_KEY: "1IEy9yPIYksh4yrYeKvYciLgXS9HJDbA",
  },
  production: {
    BUY_API_URL: "https://buy.api.live.ledger.com",
    SEGMENT_WRITE_KEY: "AEwlp5SusSLvhC6J3SmNgCnScCxnffAt",
  },
};
