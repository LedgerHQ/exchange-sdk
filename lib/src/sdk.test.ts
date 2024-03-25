import { Account, Currency } from "@ledgerhq/wallet-api-client";
import { ExchangeModule } from "@ledgerhq/wallet-api-client/lib/modules/Exchange";
import { AccountModule } from "@ledgerhq/wallet-api-client/lib/modules/Account";
import { CurrencyModule } from "@ledgerhq/wallet-api-client/lib/modules/Currency";
import BigNumber from "bignumber.js";
import { retrievePayload, confirmSwap } from "./api";
import {
  ExchangeSDK,
  FeeStrategy,
  defaultTransaction,
  elrondTransaction,
  modeSendTransaction,
  rippleTransaction,
  solanaTransaction,
  stellarTransaction,
  withoutGasLimitTransaction,
} from "./sdk";
import { WalletAPIClient } from "@ledgerhq/wallet-api-client/lib/WalletAPIClient";
import { PayinExtraIdError } from "./error";

jest.mock("./api");
const accounts: Array<Partial<Account>> = [
  {
    id: "id-1",
    currency: "currency-id-1",
    spendableBalance: new BigNumber(100000000),
  },
  {
    id: "id-2",
    currency: "currency-id-2",
    spendableBalance: new BigNumber(100000000),
  },
  {
    id: "id-stellar",
    currency: "stellar",
    spendableBalance: new BigNumber(100000000),
  },
  {
    id: "id-ripple",
    currency: "ripple",
    spendableBalance: new BigNumber(100000000),
  },
];

const mockedCurrencies: any[] = [];

function setMockedCurrencies(newCurrencies: any[]) {
  mockedCurrencies.length = 0; // Clear existing currencies
  mockedCurrencies.push(...newCurrencies);
}

jest.mock("@ledgerhq/wallet-api-client/lib/WalletAPIClient", () => {
  // Mock the WalletAPIClient as a named export
  const startSwap = jest.fn().mockResolvedValue("DeviceTransactionId");
  const completeSwap = jest.fn().mockResolvedValue("TransactionId");

  return {
    WalletAPIClient: jest.fn().mockImplementation(() => ({
      custom: {
        exchange: {
          startSwap,
          completeSwap,
        },
      },
      account: {
        list: jest.fn().mockResolvedValue(accounts as Array<Account>),
      },
      currency: {
        // can be updated in each test using the setMockedCurrencies
        list: jest.fn(() => Promise.resolve(mockedCurrencies)),
      },
    })),
  };
});

describe("swap", () => {
  it("sends back the 'transactionId' from the WalletAPI", async () => {
    const mockedTransport = {
      onMessage: jest.fn(),
      send: jest.fn(),
    };
    (retrievePayload as jest.Mock).mockResolvedValue({
      binaryPayload: "",
      signature: "",
      payinAddress: "",
      swapId: "swap-id",
    });
    (confirmSwap as jest.Mock).mockResolvedValue({});

    const currencies: Array<Partial<Currency>> = [
      {
        id: "currency-id-1",
        decimals: 4,
        family: "ethereum",
      },
    ];
    setMockedCurrencies(currencies);

    const walletApiClient = new WalletAPIClient(mockedTransport);
    const sdk = new ExchangeSDK("provider-id", undefined, walletApiClient);
    const swapData = {
      quoteId: "quoteId",
      fromAccountId: "id-1",
      toAccountId: "id-2",
      fromAmount: new BigNumber("1.908"),
      feeStrategy: "SLOW" as FeeStrategy,
      rate: 1.2,
    };

    // WHEN
    const transactionId = await sdk.swap(swapData);

    // THEN
    expect(walletApiClient.account.list).toBeCalled();
    expect(transactionId).toEqual("TransactionId");
  });

  it("throws PayinExtraIdError error when no payinExtraId provided for stellar", async () => {
    const mockedTransport = {
      onMessage: jest.fn(),
      send: jest.fn(),
    };
    (retrievePayload as jest.Mock).mockResolvedValue({
      binaryPayload: "",
      signature: "",
      payinAddress: "",
      swapId: "swap-id",
    });
    (confirmSwap as jest.Mock).mockResolvedValue({});

    const currencies: Array<Partial<Currency>> = [
      {
        id: "stellar",
        family: "stellar",
        decimals: 4,
      },
    ];
    setMockedCurrencies(currencies);

    const walletApiClient = new WalletAPIClient(mockedTransport);
    const sdk = new ExchangeSDK("provider-id", undefined, walletApiClient);
    const swapData = {
      quoteId: "quoteId",
      fromAccountId: "id-stellar",
      toAccountId: "id-2",
      fromAmount: new BigNumber("1.908"),
      feeStrategy: "SLOW" as FeeStrategy,
      rate: 1.2,
    };

    await expect(sdk.swap(swapData)).rejects.toThrow(PayinExtraIdError);
  });

  it("throws PayinExtraIdError error when no payinExtraId provided for ripple", async () => {
    const mockedTransport = {
      onMessage: jest.fn(),
      send: jest.fn(),
    };
    (retrievePayload as jest.Mock).mockResolvedValue({
      binaryPayload: "",
      signature: "",
      payinAddress: "",
      swapId: "swap-id",
    });
    (confirmSwap as jest.Mock).mockResolvedValue({});

    const currencies: Array<Partial<Currency>> = [
      {
        id: "ripple",
        family: "ripple",
        decimals: 4,
      },
    ];
    setMockedCurrencies(currencies);

    const walletApiClient = new WalletAPIClient(mockedTransport);
    const sdk = new ExchangeSDK("provider-id", undefined, walletApiClient);
    const swapData = {
      quoteId: "quoteId",
      fromAccountId: "id-ripple",
      toAccountId: "id-2",
      fromAmount: new BigNumber("1.908"),
      feeStrategy: "SLOW" as FeeStrategy,
      rate: 1.2,
    };

    await expect(sdk.swap(swapData)).rejects.toThrow(PayinExtraIdError);
  });
});

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
