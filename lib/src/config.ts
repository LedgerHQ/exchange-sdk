import { ProductType, ExchangeType } from "./sdk.types";

export type Environment = "production" | "staging" | "preproduction";

export const BACKEND_CONFIG = {
  production: {
    swap: "https://swap.ledger.com/v5/swap",
    sell: "https://exchange-tx-manager.aws.prd.ldg-tech.com/",
    fund: "https://exchange-tx-manager.aws.prd.ldg-tech.com/",
  },
  staging: {
    swap: "https://swap-stg.ledger-test.com/v5/swap",
    sell: "https://exchange-tx-manager.aws.stg.ldg-tech.com/",
    fund: "https://exchange-tx-manager.aws.stg.ldg-tech.com/",
  },
  preproduction: {
    swap: "https://swap-ppr.ledger-test.com",
    sell: "https://exchange-tx-manager.aws.ppr.ldg-tech.com/",
    fund: "https://exchange-tx-manager.aws.ppr.ldg-tech.com/",
  },
};

type ExchangeProductConfig = {
  [E in ExchangeType]?: {
    [P in ProductType]?: {
      endpoint: string;
    };
  };
};

export const webhookEndpoints = {
  confirm: (id: string) => `/history/webhook/v1/transaction/${id}/accepted`,
  cancel: (id: string) => `/history/webhook/v1/transaction/${id}/cancelled`,
};

/**
 * Available product endpoints based on exchange type
 */
export const exchangeProductConfig: ExchangeProductConfig = {
  [ExchangeType.SELL]: {
    [ProductType.CARD]: {
      endpoint: "exchange/v1/sell/card/remit",
    },
    [ProductType.SELL]: {
      endpoint: "exchange/v1/sell/onramp_offramp/remit",
    },
  },

  [ExchangeType.FUND]: {
    [ProductType.CARD]: {
      endpoint: "exchange/v1/fund/card/remit",
    },
  },
};
