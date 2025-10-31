import { useExchangeSDK } from "@/providers/ExchangeProvider";

export const useRequestAccounts = () => {
  const sdk = useExchangeSDK();

  const requestAccounts = async (
    currencyIds: string[] = ["etherium", "bitcoin"],
  ) => {
    if (!sdk) return [];
    try {
      return await sdk.walletAPI.account.request({ currencyIds });
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  return requestAccounts;
};
