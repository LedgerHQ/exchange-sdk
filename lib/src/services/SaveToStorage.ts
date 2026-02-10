import { WalletAPIClient } from "@ledgerhq/wallet-api-client";
import { EventMappingTable, CardProvider } from "./SaveToStorage.types";

const STORAGE_NAMESPACE = "v4_card_integration_state";

const CARD_INTEGRATION_MAPPING: EventMappingTable = {
  page_view: {
    confirm_your_email: {
      providerIds: ["baanx"],
      flag: "onboarding_started",
    },
    order_your_card: {
      providerIds: ["baanx"],
      flag: "onboarding_completed",
    },
    dashboard: {
      providerIds: ["baanx"],
      flag: "card_active",
    },
  },

  event: {
    topup_completed: {
      providerIds: ["baanx"],
      flag: "funded_card",
    },
  },
};

export const createSaveToStorageService = ({
  providerId,
  walletAPI,
}: {
  providerId: string;
  walletAPI: WalletAPIClient;
}) => {
  const saveToStorage = async (type: "page_view" | "event", event: string) => {
    const typeMapping = CARD_INTEGRATION_MAPPING[type];

    if (!typeMapping) {
      return;
    }

    const mapping = typeMapping[event];

    if (!mapping || !mapping.providerIds.includes(providerId as CardProvider)) {
      return;
    }

    const currentValue = await walletAPI.storage.get(STORAGE_NAMESPACE);
    const parsedValue = currentValue ? JSON.parse(currentValue) : {};

    const providerState = parsedValue[providerId] || {
      flags: {},
      last_updated_at: null,
    };
    providerState.flags[mapping.flag] = true;
    providerState.last_updated_at = new Date().toISOString();

    parsedValue[providerId] = providerState;

    await walletAPI.storage.set(STORAGE_NAMESPACE, JSON.stringify(parsedValue));
  };

  return {
    saveToStorage,
  };
};
