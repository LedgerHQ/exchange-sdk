import { ExchangeType, ProductType } from "./sdk.types";
import {
  CancelTokenApprovalRequest,
  ConfirmTokenApprovalRequest,
  SupportedProductsByExchangeType,
} from "./api.types";

/**
 * Available product endpoints based on exchange type
 */
export const supportedProductsByExchangeType: SupportedProductsByExchangeType =
  {
    [ExchangeType.SWAP]: {},
    [ExchangeType.SELL]: {
      [ProductType.CARD]: "exchange/v1/sell/card/remit",
      [ProductType.SELL]: "exchange/v1/sell/onramp_offramp/remit",
    },
    [ExchangeType.FUND]: {
      [ProductType.CARD]: "exchange/v1/fund/card/remit",
    },
  };

/**
 * TOKEN APPROVAL *
 **/

export async function confirmTokenApproval(data: ConfirmTokenApprovalRequest) {
  // TODO: uncomment when ready
  // const { orderId, ...payload } = data;
  // await tokenApprovalAxiosClient.post(
  //   `/webhook/v1/transaction/token-approval/${orderId}/accepted`,
  //   payload,
  // );

  console.log("*** CONFIRM TOKEN APPROVAL ***", data);
}

export async function cancelTokenApproval(data: CancelTokenApprovalRequest) {
  // TODO: uncomment when ready
  // const { orderId, ...payload } = data;
  // await tokenApprovalAxiosClient.post(
  //   `/webhook/v1/transaction/token-approval/${orderId}/cancelled`,
  //   payload,
  // );

  console.log("*** CANCEL TOKEN APPROVAL ***", data);
}
