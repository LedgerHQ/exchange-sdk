import axios, { AxiosInstance } from "axios";
import {
  decodeSellPayload,
  decodeFundPayload,
} from "@ledgerhq/hw-app-exchange";
import { ExchangeType, ProductType } from "./sdk.types";
import {
  CancelFundRequest,
  CancelSellRequest,
  CancelSwapRequest,
  CancelTokenApprovalRequest,
  ConfirmFundRequest,
  ConfirmSellRequest,
  ConfirmSwapRequest,
  ConfirmTokenApprovalRequest,
  FundRequestPayload,
  FundResponsePayload,
  SellRequestPayload,
  SellResponsePayload,
  SupportedProductsByExchangeType,
  SwapBackendResponse,
  SwapPayloadRequestData,
  SwapPayloadResponse,
} from "./api.types";
import { SellPayload } from "@ledgerhq/hw-app-exchange/lib/SellUtils";
import { VERSION } from "./version";
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
