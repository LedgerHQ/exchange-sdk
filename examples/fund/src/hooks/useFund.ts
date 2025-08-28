import { useExchangeSDK } from "@/providers/ExchangeProvider";
import BigNumber from "bignumber.js";

export const useFund = () => {
  const sdk = useExchangeSDK();

  const executeFund = async (params: {
    fromAccountId: string;
    fromAmount: BigNumber;
  }) => {
    if (!sdk) return;
    try {
      return await sdk.fund({
        quoteId: "123",
        ...params,
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return executeFund;
};
