"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ExchangeSDK } from "@ledgerhq/exchange-sdk";
import {
  getSimulatorTransport,
  profiles,
} from "@ledgerhq/wallet-api-simulator";
import { ReactNode } from "react";
import { SimulatorProfile } from "@ledgerhq/wallet-api-simulator/lib/types";

const PROVIDER_ID = "FUND_TEST";

const MOCK_SELL_PROFILE: SimulatorProfile = {
  ...profiles.STANDARD,
  permissions: {
    ...profiles.STANDARD.permissions,
    methodIds: [
      "account.list",
      "account.request",
      "currency.list",
      "custom.exchange.error",
      "custom.exchange.start",
      "custom.exchange.complete",
      "custom.close",
      "wallet.info",
    ],
  },
};

const MOCK_SELL_EXCHANGE_HANDLERS = {
  // 1.  `exchangeModule.startSell`
  "custom.exchange.start": async (params: any) => {
    return { transactionId: "b3f1df21-9016-4bba-b0ea-46b1a9b1b84c" };
  },

  // 2. `exchangeModule.completeSell`
  "custom.exchange.complete": async (params: any) => {
    return { transactionHash: "MOCK_TRANSACTION_HASH" };
  },
};

const ExchangeContext = createContext<ExchangeSDK | null>(null);

interface ExchangeProviderProps {
  children: ReactNode;
}

export function ExchangeProvider({ children }: ExchangeProviderProps) {
  const [sdk, setSdk] = useState<ExchangeSDK | null>(null);

  useEffect(() => {
    let transport;
    if (process.env.NEXT_PUBLIC_SIMULATOR_MODE) {
      transport = getSimulatorTransport(MOCK_SELL_PROFILE, MOCK_SELL_PROFILE);
    }

    setSdk(
      new ExchangeSDK(PROVIDER_ID, {
        transport,
        environment: "preproduction",
        customUrl: "https://127.0.0.1:8443",
      }),
    );
  }, []);
  return (
    <ExchangeContext.Provider value={sdk}>{children}</ExchangeContext.Provider>
  );
}

export const useExchangeSDK = () => {
  return useContext(ExchangeContext);
};
