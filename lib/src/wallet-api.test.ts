import BigNumber from "bignumber.js";
import {
  defaultTransaction,
  elrondTransaction,
  modeSendTransaction,
  rippleTransaction,
  solanaTransaction,
  stellarTransaction,
  withoutGasLimitTransaction,
} from "./wallet-api";
import { PayinExtraIdError } from "./error";

describe("defaultTransaction function", () => {
  it("creates a Transaction with correct properties", () => {
    const transaction = defaultTransaction({
      family: "algorand",
      amount: new BigNumber("1.908"),
      recipient: "ADDRESS",
      customFeeConfig: { fee: new BigNumber("0.1") },
    });

    expect(transaction).toEqual({
      family: "algorand",
      amount: new BigNumber("1.908"),
      recipient: "ADDRESS",
      fee: new BigNumber("0.1"),
    });
  });

  it("ignores unexpected properties in customFeeConfig", () => {
    const transaction = defaultTransaction({
      family: "cardano",
      amount: new BigNumber("5"),
      recipient: "ADDRESS",
      customFeeConfig: { fee: new BigNumber("0.2") },
    });

    expect(transaction).toEqual({
      family: "cardano",
      amount: new BigNumber("5"),
      recipient: "ADDRESS",
      fee: new BigNumber("0.2"),
    });
  });
});

describe("modeSendTransaction function", () => {
  it('creates a Transaction with mode: "send"', () => {
    const transaction = modeSendTransaction({
      family: "cardano",
      amount: new BigNumber("5"),
      recipient: "ADDRESS",
      customFeeConfig: { fee: new BigNumber("0.01") },
    });

    expect(transaction).toEqual({
      family: "cardano",
      amount: new BigNumber("5"),
      recipient: "ADDRESS",
      mode: "send",
      fee: new BigNumber("0.01"),
    });
  });
});

describe("stellarTransaction function", () => {
  it("throws PayinExtraIdError if payinExtraId is missing", () => {
    expect(() =>
      stellarTransaction({
        family: "stellar",
        amount: new BigNumber("1.908"),
        recipient: "ADDRESS",
        customFeeConfig: {},
      })
    ).toThrowError(PayinExtraIdError);
  });

  it("creates a StellarTransaction with memoValue and memoType", () => {
    const transaction = stellarTransaction({
      family: "stellar",
      amount: new BigNumber("1.908"),
      recipient: "ADDRESS",
      customFeeConfig: {},
      payinExtraId: "MEMO",
    });

    expect(transaction).toEqual({
      family: "stellar",
      amount: new BigNumber("1.908"),
      recipient: "ADDRESS",
      memoValue: "MEMO",
      memoType: "MEMO_TEXT",
    });
  });
});

describe("rippleTransaction function", () => {
  it("throws PayinExtraIdError if payinExtraId is missing", () => {
    expect(() =>
      rippleTransaction({
        family: "ripple",
        amount: new BigNumber("10"),
        recipient: "ADDRESS",
        customFeeConfig: {},
      })
    ).toThrowError(PayinExtraIdError);
  });

  it("creates a RippleTransaction with tag", () => {
    const transaction = rippleTransaction({
      family: "ripple",
      amount: new BigNumber("10"),
      recipient: "ADDRESS",
      customFeeConfig: {},
      payinExtraId: "123456",
    });

    expect(transaction).toEqual({
      family: "ripple",
      amount: new BigNumber("10"),
      recipient: "ADDRESS",
      tag: 123456,
    });
  });
});

describe("withoutGasLimitTransaction function", () => {
  it("removes gasLimit from customFeeConfig", () => {
    const transaction = withoutGasLimitTransaction({
      family: "bitcoin",
      amount: new BigNumber("1"),
      recipient: "ADDRESS",
      customFeeConfig: { gasLimit: new BigNumber("21000") },
    });

    expect(transaction).toEqual({
      family: "bitcoin",
      amount: new BigNumber("1"),
      recipient: "ADDRESS",
    });
  });
});

describe("solanaTransaction function", () => {
  it("creates a SolanaTransaction with model object", () => {
    const transaction = solanaTransaction({
      family: "solana",
      amount: new BigNumber("0.5"),
      recipient: "ADDRESS",
      customFeeConfig: {},
    });

    expect(transaction).toEqual({
      family: "solana",
      amount: new BigNumber("0.5"),
      recipient: "ADDRESS",
      model: { kind: "transfer", uiState: {} },
    });
  });
});

describe("elrondTransaction function", () => {
  it('creates an ElrondTransaction with mode: "send"', () => {
    const transaction = elrondTransaction({
      family: "elrond",
      amount: new BigNumber("10"),
      recipient: "ADDRESS",
      customFeeConfig: {},
    });

    expect(transaction).toEqual({
      family: "elrond",
      amount: new BigNumber("10"),
      recipient: "ADDRESS",
      mode: "send",
      gasLimit: 0,
    });
  });
});
