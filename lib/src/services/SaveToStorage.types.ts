export type CardProvider = "baanx";

type CardIntegrationFlag =
  | "onboarding_started"
  | "onboarding_completed"
  | "card_active"
  | "funded_card"
  | "onchain_spending_used";

interface EventMapping {
  providerIds: CardProvider[];
  flag: CardIntegrationFlag;
}

export type EventMappingTable = {
  page_view: Record<string, EventMapping>;
  event: Record<string, EventMapping>;
};
