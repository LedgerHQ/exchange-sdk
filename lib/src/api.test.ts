import { create } from "axios";
import BigNumber from "bignumber.js";
import { Account } from "@ledgerhq/wallet-api-client";

jest.mock("axios");
const mockPost = jest.fn();
(create as jest.Mock).mockImplementation(() => {
  return {
    post: mockPost,
  };
});

import { cancelSwap, confirmSwap, retrievePayload } from "./api";

describe("retrievePayload", () => {
  afterEach(() => {
    mockPost.mockReset();
  });

  it("converts input data and output data", async () => {
    // GIVEN
    const data = {
      provider: "provider-name",
      deviceTransactionId: "4492050566",
      fromAccount: createAccount("12", "btc-account", "bitcoin", "0x998"),
      toAccount: createAccount("13", "eth-account", "ethereum", "0x999"),
      amount: BigNumber("1.908"),
      amountInAtomicUnit: BigInt(1_908_000_000_000),
      rateId: "978400",
    };
    const responseData = swapApiResponse();
    mockPost.mockResolvedValueOnce({ data: responseData });

    // WHEN
    const result = await retrievePayload(data);

    // THEN
    const expectedResult = {
      binaryPayload: Buffer.from(""),
      payinAddress: "0x31137882f060458bde9e9ac3caa27b030d8f85c2",
      signature: Buffer.from(""),
      swapId: "swap-id2",
    };
    expect(result).toEqual(expectedResult);
    const expectedRequest = {
      provider: "provider-name",
      deviceTransactionId: "4492050566",
      from: "bitcoin",
      to: "ethereum",
      address: "0x999",
      refundAddress: "0x998",
      amountFrom: "1.908",
      amountFromInSmallestDenomination: 1908000000000,
      rateId: "978400",
    };
    expect(mockPost.mock.calls[0][0]).toEqual("");
    expect(mockPost.mock.calls[0][1]).toEqual(expectedRequest);
  });

  it("doesn't send rateId if there is none in the parameter", async () => {
    // GIVEN
    const data = {
      provider: "provider-name",
      deviceTransactionId: "4492050566",
      fromAccount: createAccount("12", "btc-account", "bitcoin", "0x998"),
      toAccount: createAccount("13", "eth-account", "ethereum", "0x999"),
      amount: BigNumber("1.908"),
      amountInAtomicUnit: BigInt(1_908_000_000_000),
    };
    const responseData = swapApiResponse();
    mockPost.mockResolvedValueOnce({ data: responseData });

    // WHEN
    const result = await retrievePayload(data);

    // THEN
    expect(result).not.toBeUndefined();
    const expectedRequest = {
      provider: "provider-name",
      deviceTransactionId: "4492050566",
      from: "bitcoin",
      to: "ethereum",
      address: "0x999",
      refundAddress: "0x998",
      amountFrom: "1.908",
      amountFromInSmallestDenomination: 1908000000000,
    };
    expect(mockPost.mock.calls[0][1]).toEqual(expectedRequest);
  });
});

describe("confirmSwap", () => {
  afterEach(() => {
    mockPost.mockReset();
  });

  it("calls 'accepted' endpoint", async () => {
    // WHEN
    await confirmSwap("provider-name", "swap-id", "transaction-id");

    // THEN
    expect(mockPost.mock.calls[0][0]).toEqual("accepted");
  });
});

describe("cancelSwap", () => {
  afterEach(() => {
    mockPost.mockReset();
  });

  it("calls 'cancelled' endpoint", async () => {
    // WHEN
    await cancelSwap("provider-name", "swap-id");

    // THEN
    expect(mockPost.mock.calls[0][0]).toEqual("cancelled");
  });
});

function createAccount(
  id: string,
  name: string,
  currency: string,
  address = "0x999"
): Account {
  return {
    id,
    name,
    address,
    currency,
    balance: new BigNumber("0"),
    spendableBalance: new BigNumber("0"),
    blockHeight: 18,
    lastSyncDate: new Date(),
  };
}

function swapApiResponse() {
  return {
    provider: "provider-name",
    swapId: "swap-id2",
    apiExtraFee: 1,
    apiFee: 1,
    refundAddress: "0x31137882f060458bde9e9ac3caa27b030d8f85c1",
    amountExpectedFrom: 3000,
    amountExpectedTo: 1,
    status: "finished",
    from: "ethereum/erc20/bat",
    to: "ethereum",
    payinAddress: "0x31137882f060458bde9e9ac3caa27b030d8f85c2",
    payoutAddress: "0x31137882f060458bde9e9ac3caa27b030d8f85c3",
    createdAt: "2023-07-05T22:12:15.378497Z",
    binaryPayload: "",
    signature: "",
  };
}
