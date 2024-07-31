import axios from "axios";
import { Account } from "@ledgerhq/wallet-api-client";
import BigNumber from "bignumber.js";

const SWAP_BACKEND_URL = "https://swap.ledger.com/v5/swap";

let axiosClient = axios.create({
  baseURL: SWAP_BACKEND_URL,
});

/**
 * Override the default axios client base url environment (default is production)
 * @param {string} url
 */
export function setBackendUrl(url: string) {
  axiosClient = axios.create({
    baseURL: url,
  });
}

export type PayloadRequestData = {
  provider: string;
  deviceTransactionId: string;
  fromAccount: Account;
  toAccount: Account;
  amount: BigNumber;
  amountInAtomicUnit: BigNumber;
  quoteId?: string;
  toNewTokenId?: string;
};
export type PayloadResponse = {
  binaryPayload: string;
  signature: string;
  payinAddress: string;
  swapId: string;
  payinExtraId?: string;
};
export async function retrievePayload(
  data: PayloadRequestData,
): Promise<PayloadResponse> {
  const request = {
    provider: data.provider,
    deviceTransactionId: data.deviceTransactionId,
    from: data.fromAccount.currency,
    to: data.toNewTokenId || data.toAccount.currency,
    address: data.toAccount.address,
    refundAddress: data.fromAccount.address,
    amountFrom: data.amount.toString(),
    amountFromInSmallestDenomination: Number(data.amountInAtomicUnit),
    rateId: data.quoteId,
  };
  const res = await axiosClient.post("", request);

  return parseSwapBackendInfo(res.data);
}

export type ConfirmSwapRequest = {
  provider: string;
  swapId: string;
  transactionId: string;
  sourceCurrencyId?: string;
  targetCurrencyId?: string;
  hardwareWalletType?: string;
};

export async function confirmSwap(payload: ConfirmSwapRequest) {
  await axiosClient.post("accepted", payload);
}

export type CancelSwapRequest = {
  provider: string;
  swapId: string;
  statusCode?: string;
  errorMessage?: string;
  sourceCurrencyId?: string;
  targetCurrencyId?: string;
  hardwareWalletType?: string;
  swapType?: string;
  swapStep?: string;
};

export async function cancelSwap(payload: CancelSwapRequest) {
  await axiosClient.post("cancelled", payload);
}

type SwapBackendResponse = {
  provider: string;
  swapId: string;
  apiExtraFee: number;
  apiFee: number;
  refundAddress: string;
  amountExpectedFrom: number;
  amountExpectedTo: number;
  status: string;
  from: string;
  to: string;
  payinAddress: string;
  payoutAddress: string;
  createdAt: string; // ISO-8601
  binaryPayload: string;
  signature: string;
  payinExtraId?: string;
};

function parseSwapBackendInfo(response: SwapBackendResponse): {
  binaryPayload: string;
  signature: string;
  payinAddress: string;
  swapId: string;
  payinExtraId?: string;
} {
  return {
    binaryPayload: response.binaryPayload,
    signature: response.signature,
    payinAddress: response.payinAddress,
    swapId: response.swapId,
    payinExtraId: response.payinExtraId,
  };
}
