"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ExchangeSDK } from "@ledgerhq/exchange-sdk";
import {
  getSimulatorTransport,
  profiles,
} from "@ledgerhq/wallet-api-simulator";
import { ReactNode } from "react";

const PROVIDER_ID = "FUND_TEST";

const ExchangeContext = createContext<ExchangeSDK | null>(null);

interface ExchangeProviderProps {
  children: ReactNode;
}

export function ExchangeProvider({ children }: ExchangeProviderProps) {
  const [sdk, setSdk] = useState<ExchangeSDK | null>(null);

  useEffect(() => {
    let transport;
    if (process.env.NEXT_PUBLIC_SIMULATOR_MODE) {
      transport = getSimulatorTransport(profiles.STANDARD);
    }

    setSdk(new ExchangeSDK(PROVIDER_ID, transport));
  }, []);
  return (
    <ExchangeContext.Provider value={sdk}>{children}</ExchangeContext.Provider>
  );
}

export const useExchangeSDK = () => {
  return useContext(ExchangeContext);
};
