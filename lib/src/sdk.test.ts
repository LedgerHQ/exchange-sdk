import BigNumber from "bignumber.js";
import {
  Account,
  Currency,
  WalletAPIClient,
  defaultLogger,
} from "@ledgerhq/wallet-api-client";
import { ExchangeModule } from "@ledgerhq/wallet-api-exchange-module";
import { AccountModule } from "@ledgerhq/wallet-api-client/lib/modules/Account";
import { CurrencyModule } from "@ledgerhq/wallet-api-client/lib/modules/Currency";
import { retrievePayload, confirmSwap } from "./api";
import { ExchangeSDK, FeeStrategy } from "./sdk";
import { getCustomModule } from "./wallet-api";
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
const mockAccountList = jest.spyOn(AccountModule.prototype, "list");
const mockCurrenciesList = jest.spyOn(CurrencyModule.prototype, "list");
const mockStartExchange = jest
  .spyOn(ExchangeModule.prototype, "startSell")
  .mockResolvedValue("DeviceTransactionId");
const mockStartSwapExchange = jest
  .spyOn(ExchangeModule.prototype, "startSwap")
  .mockResolvedValue("DeviceTransactionId");
const mockCompleteSwap = jest.spyOn(ExchangeModule.prototype, "completeSwap")
  .mockResolvedValue("TransactionId");
const mockCompleteSell = jest.spyOn(ExchangeModule.prototype, "completeSell")
  .mockResolvedValue("TransactionId");

const mockedTransport = {
  onMessage: jest.fn(),
  send: jest.fn(),
};
const walletApiClient = new WalletAPIClient(
  mockedTransport,
  defaultLogger,
  getCustomModule
);
const sdk = new ExchangeSDK("provider-id", mockedTransport, walletApiClient);

beforeEach(() => {
  mockAccountList.mockClear();
  mockAccountList.mockResolvedValue(accounts as Array<Account>);

  mockCurrenciesList.mockClear();
  mockStartExchange.mockClear();
  mockStartSwapExchange.mockClear();
  mockCompleteSwap.mockClear();
  mockCompleteSell.mockClear();
});

describe("swap", () => {
  beforeAll(() => {
    (retrievePayload as jest.Mock).mockResolvedValue({
      binaryPayload: "",
      signature: "",
      payinAddress: "",
      swapId: "swap-id",
    });
    (confirmSwap as jest.Mock).mockResolvedValue({});
  });

  it("sends back the 'transactionId' from the WalletAPI", async () => {
    // GIVEN
    const currencies: Array<Partial<Currency>> = [
      {
        id: "currency-id-1",
        decimals: 4,
        family: "ethereum",
      },
    ];
    mockCurrenciesList.mockResolvedValue(currencies as any);

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
    expect(mockStartSwapExchange).toBeCalled();
    expect(mockAccountList).toBeCalled();
    expect(mockCompleteSwap).toBeCalled();
    expect(mockCompleteSell).not.toBeCalled();
    expect(transactionId).toEqual("TransactionId");
  });

  it("throws PayinExtraIdError error when no payinExtraId provided for stellar", async () => {
    const currencies: Array<Partial<Currency>> = [
      {
        id: "stellar",
        family: "stellar",
        decimals: 4,
      },
    ];
    mockCurrenciesList.mockResolvedValue(currencies as any);

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
    const currencies: Array<Partial<Currency>> = [
      {
        id: "ripple",
        family: "ripple",
        decimals: 4,
      },
    ];
    mockCurrenciesList.mockResolvedValue(currencies as any);

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

describe("sell", () => {
  it("sends back the 'transactionId' from the WalletAPI", async () => {
    // GIVEN
    const currencies: Array<Partial<Currency>> = [
      {
        id: "currency-id-1",
        decimals: 4,
        family: "ethereum",
      },
    ];
    mockCurrenciesList.mockResolvedValue(currencies as any);

    const mockSellPayload = jest.fn();
    mockSellPayload.mockResolvedValue({
      recipientAddress: "0xfff",
      amount: new BigNumber("1.907"),
      binaryPayload: Buffer.from(""),
      signature: Buffer.from(""),
    });
    const swapData = {
      quoteId: "quoteId",
      accountId: "id-1",
      amount: new BigNumber("1.908"),
      feeStrategy: "SLOW" as FeeStrategy,
      getSellPayload: mockSellPayload,
    };

    // WHEN
    const transactionId = await sdk.sell(swapData);

    // THEN
    expect(mockStartExchange).toBeCalled();
    expect(mockAccountList).toBeCalled();
    expect(mockCompleteSwap).not.toBeCalled();
    expect(mockCompleteSell).toBeCalled();
    expect(transactionId).toEqual("TransactionId");
  });
});
