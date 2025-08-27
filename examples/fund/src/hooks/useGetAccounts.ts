import { useExchangeSDK } from "@/providers/ExchangeProvider";
import { useCallback } from "react";

export const useGetAccounts = () => {
  const sdk = useExchangeSDK();

  const getAccounts = async () => {
    if (!sdk) return [];
    try {
      return await sdk.walletAPI.account.list();
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  return getAccounts;
};
