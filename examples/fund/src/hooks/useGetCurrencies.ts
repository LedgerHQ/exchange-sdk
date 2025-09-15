import { useExchangeSDK } from "@/providers/ExchangeProvider";

export const useGetCurrencies = () => {
  const sdk = useExchangeSDK();

  const getCurrencies = async (currencyIds: string[]) => {
    if (!sdk) return [];
    try {
      return await sdk.walletAPI.currency.list({
        currencyIds,
      });
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  return getCurrencies;
};
