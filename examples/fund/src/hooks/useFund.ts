import { useExchangeSDK } from "@/providers/ExchangeProvider";
import BigNumber from "bignumber.js";

export const useFund = () => {
  const sdk = useExchangeSDK();

  const executeFund = async (params: {
    orderId: string;
    fromAccountId: string;
    amount: BigNumber;
  }) => {
    console.log(">> sdk", sdk);
    if (!sdk) return;
    try {
      const fundData = {
        orderId: params.orderId,
        fromAccountId: params.fromAccountId,
        fromAmount: params.amount,
      };
      return await sdk.fund(fundData);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return executeFund;
};
