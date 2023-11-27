import axios from "axios";
import { Account } from "@ledgerhq/wallet-api-client";
import BigNumber from "bignumber.js";

const SWAP_BACKEND_URL = "https://swap.ledger.com/v5/swap";
const SWAP_BACKEND_STAGING_URL = "https://swap.aws.stg.ldg-tech.com/v5/swap";

let axiosClient = axios.create({
  baseURL: SWAP_BACKEND_URL,
});

export type Env = "PROD" | "STAGING";

/**
 * Override the default axios client base url environment (default is production)
 * @param {Env} env - Environment to use: "STAGING" or "PROD"
 */
export function setEnv(env: Env) {
  axiosClient = axios.create({
    baseURL: env === "PROD" ? SWAP_BACKEND_URL : SWAP_BACKEND_STAGING_URL,
  });
}

export type PayloadRequestData = {
  provider: string;
  deviceTransactionId: string;
  fromAccount: Account;
  toAccount: Account;
  amount: BigNumber;
  amountInAtomicUnit: bigint;
  quoteId?: string;
  toNewTokenId? : string;
};
export type PayloadResponse = {
  binaryPayload: Buffer;
  signature: Buffer;
  payinAddress: string;
  swapId: string;
};
export async function retrievePayload(
  data: PayloadRequestData
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
    swapId: data.quoteId,
  };
  // logger.log("Request to SWAP Backend:", request);
  const res = await axiosClient.post("", request);

  // logger.log("Backend result:", res);
  return parseSwapBackendInfo(res.data);
}

export async function confirmSwap(
  provider: string,
  swapId: string,
  transactionId: string
) {
  await axiosClient.post("accepted", {
    provider,
    swapId,
    transactionId,
  });
}

export async function cancelSwap(provider: string, swapId: string) {
  await axiosClient.post("cancelled", { provider, swapId });
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
};
function parseSwapBackendInfo(response: SwapBackendResponse): {
  binaryPayload: Buffer;
  signature: Buffer;
  payinAddress: string;
  swapId: string;
} {
  return {
    binaryPayload: Buffer.from(response.binaryPayload, "hex"),
    signature: Buffer.from(response.signature, "hex"),
    payinAddress: response.payinAddress,
    swapId: response.swapId,
  };
}
