export type Environment = "production" | "staging" | "preproduction";

export const BACKEND_CONFIG = {
  production: {
    swap: "https://swap.ledger.com/v5/swap",
    sell: "https://exchange-tx-manager.aws.prd.ldg-tech.com/",
    fund: "https://exchange-tx-manager.aws.prd.ldg-tech.com/",
  },
  staging: {
    swap: "https://swap-staging.ledger.com/v5/swap",
    sell: "https://exchange-tx-manager.aws.stg.ldg-tech.com/",
    fund: "https://exchange-tx-manager.aws.stg.ldg-tech.com/",
  },
  preproduction: {
    swap: "https://swap-preprod.ledger.com/v5/swap",
    sell: "https://exchange-tx-manager.aws.preprod.ldg-tech.com/",
    fund: "https://exchange-tx-manager.aws.preprod.ldg-tech.com/",
  },
};
