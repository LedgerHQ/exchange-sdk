import { useExchangeSDK as useExchangeSdkProvider } from "@/providers/ExchangeProvider";
import BigNumber from "bignumber.js";

type SdkMethodMap = {
  fund: {
    params: { fromAccountId: string; fromAmount: BigNumber; quoteId?: string };
    return: unknown;
  };
  requestAndSignForAccount: {
    params: { accountId: string; message: Buffer; currencyIds: string[] };
    return: unknown;
  };
  closeLiveApp: {
    params: undefined;
    return: unknown;
  };
};

export const useExchangeSdk = () => {
  const sdk = useExchangeSdkProvider();

  async function execute<TMethod extends keyof SdkMethodMap>(
    method: TMethod,
    ...params: SdkMethodMap[TMethod]["params"] extends void
      ? [] // if no params
      : [SdkMethodMap[TMethod]["params"]] // otherwise tuple with params
  ): Promise<SdkMethodMap[TMethod]["return"] | undefined> {
    if (!sdk) return;
    try {
      console.log(">> method", method);
      return (sdk[method as keyof typeof sdk] as (...args: any[]) => any)(
        ...params,
      ) as Promise<SdkMethodMap[TMethod]["return"]>;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  return { execute };
};
