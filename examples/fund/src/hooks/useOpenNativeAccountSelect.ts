import { useExchangeSDK } from "@/providers/ExchangeProvider";
import { Account } from "@ledgerhq/wallet-api-client";

export const useOpenNativeAccountSelect = () => {
  const sdk = useExchangeSDK();

  const openNativeAccountSelect = async (
    currencyIds: string[],
  ): Promise<Account | undefined> => {
    if (!sdk) return undefined;
    try {
      return await sdk.walletAPI.account.request({
        currencyIds,
      });
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };

  return openNativeAccountSelect;
};
