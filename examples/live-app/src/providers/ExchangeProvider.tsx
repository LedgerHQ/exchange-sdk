"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ExchangeSDK } from "@ledgerhq/exchange-sdk";
import { ReactNode } from "react";

const PROVIDER_ID = "FUND_TEST";

const ExchangeContext = createContext<ExchangeSDK | null>(null);

interface ExchangeProviderProps {
  children: ReactNode;
}

export function ExchangeProvider({ children }: ExchangeProviderProps) {
  const [sdk, setSdk] = useState<ExchangeSDK | null>(null);

  useEffect(() => {
    setSdk(
      new ExchangeSDK(PROVIDER_ID, undefined, undefined, undefined, {
        enabled: true,
        writeKey: "6AW57DWSPwJJtRPXtW1tCvNDPUykP6EI",
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
