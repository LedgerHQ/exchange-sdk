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
import { MessageModule } from "@ledgerhq/wallet-api-client/lib/modules/Message";
import {
  retrieveSwapPayload,
  confirmSwap,
  cancelSwap,
  retrieveSellPayload,
  confirmSell,
  cancelSell,
  retrieveFundPayload,
  confirmFund,
  cancelFund,
  confirmTokenApproval,
  cancelTokenApproval,
} from "./api";
import { ExchangeSDK } from "./sdk";
import { getCustomModule } from "./wallet-api";
import {
  CompleteExchangeError,
  IgnoredSignatureStepError,
  PayinExtraIdError,
} from "./error/SwapError";
import {
  FeeStrategy,
  FundInfo,
  ProductType,
  SellInfo,
  TokenApprovalInfo,
} from "./sdk.types";
import { RequestAccountError, SignError } from "./error/ExchangeSdkError";

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

const device = {
  modelId: "nanoX",
  deviceId: "device-id",
};
const mockAccountList = jest.spyOn(AccountModule.prototype, "list");
const mockAccountRequest = jest
  .spyOn(AccountModule.prototype, "request")
  .mockResolvedValue({
    id: "ACCOUNT_ID",
    name: "ACCOUNT_NAME",
  } as Account);
const mockCurrenciesList = jest.spyOn(CurrencyModule.prototype, "list");
const mockSignMessage = jest
  .spyOn(MessageModule.prototype, "sign")
  .mockResolvedValue(Buffer.from("Polo"));
const mockStartExchange = jest
  .spyOn(ExchangeModule.prototype, "startSell")
  .mockResolvedValue("DeviceTransactionId");
const mockStartSwapExchange = jest
  .spyOn(ExchangeModule.prototype, "startSwap")
  .mockResolvedValue({
    device,
    transactionId: "DeviceTransactionId",
  });
const mockStartFund = jest
  .spyOn(ExchangeModule.prototype, "startFund")
  .mockResolvedValue("DeviceTransactionId");
const mockCompleteSwap = jest
  .spyOn(ExchangeModule.prototype, "completeSwap")
  .mockResolvedValue("TransactionId");
const mockCompleteSell = jest
  .spyOn(ExchangeModule.prototype, "completeSell")
  .mockResolvedValue("TransactionId");
const mockCompleteFund = jest
  .spyOn(ExchangeModule.prototype, "completeFund")
  .mockResolvedValue("TransactionId");

const mockedTransport = {
  onMessage: jest.fn(),
  send: jest.fn(),
};
const walletApiClient = new WalletAPIClient(
  mockedTransport,
  defaultLogger,
  getCustomModule,
);

const mockSignAndBroadcast = jest
  .spyOn(walletApiClient.transaction, "signAndBroadcast")
  .mockResolvedValue("TransactionId");

const sdk = new ExchangeSDK("provider-id", mockedTransport, walletApiClient);

beforeEach(() => {
  mockAccountList.mockClear();
  mockAccountList.mockResolvedValue(accounts as Array<Account>);

  mockCurrenciesList.mockClear();
  mockStartExchange.mockClear();
  mockStartSwapExchange.mockClear();
  mockStartFund.mockClear();
  mockCompleteSwap.mockClear();
  mockCompleteSell.mockClear();
  mockCompleteFund.mockClear();
});

describe("swap", () => {
  beforeAll(() => {
    (retrieveSwapPayload as jest.Mock).mockResolvedValue({
      binaryPayload: "",
      signature: "",
      payinAddress: "",
      swapId: "swap-id",
    });
    (confirmSwap as jest.Mock).mockResolvedValue({});
    (cancelSwap as jest.Mock).mockResolvedValue({});
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
      feeStrategy: "slow" as FeeStrategy,
      rate: 1.2,
    };

    // WHEN
    const { transactionId, swapId } = await sdk.swap(swapData);

    // THEN
    expect(mockStartSwapExchange).toBeCalled();
    expect(mockAccountList).toBeCalled();
    expect(mockCompleteSwap).toBeCalled();
    expect(mockCompleteSell).not.toBeCalled();
    expect(transactionId).toEqual("TransactionId");
    expect(swapId).toEqual("swap-id");
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
      feeStrategy: "slow" as FeeStrategy,
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
      feeStrategy: "slow" as FeeStrategy,
      rate: 1.2,
    };

    await expect(sdk.swap(swapData)).rejects.toThrow(PayinExtraIdError);
  });

  it("sends swapStep to cancelled operation when CompleteExchangeError is thrown", async () => {
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
      feeStrategy: "slow" as FeeStrategy,
      rate: 1.2,
    };

    mockCompleteSwap.mockRejectedValueOnce(
      new IgnoredSignatureStepError(
        new CompleteExchangeError("SIGN_COIN_TRANSACTION", "error message"),
      ),
    );

    // WHEN
    await expect(sdk.swap(swapData)).rejects.toThrow(IgnoredSignatureStepError);

    // THEN
    expect(cancelSwap as jest.Mock).toHaveBeenCalledWith(
      {
        provider: "provider-id",
        swapId: "swap-id",
        statusCode: "SignatureStepError",
        errorMessage: "error message",
        sourceCurrencyId: "currency-id-1",
        targetCurrencyId: "currency-id-2",
        hardwareWalletType: "nanoX",
        swapType: "fixed",
        swapStep: "UNKNOWN_STEP",
      },
      undefined,
    );
  });
});

describe("sell", () => {
  const currencies: Array<Partial<Currency>> = [
    {
      id: "currency-id-1",
      decimals: 4,
      family: "ethereum",
    },
  ];

  beforeAll(() => {
    (retrieveSellPayload as jest.Mock).mockResolvedValue({
      payinAddress: "",
      providerSig: {
        payload: Buffer.from(""),
        signature: Buffer.from(""),
      },
      sellId: "sell-id",
    });
    (confirmSell as jest.Mock).mockResolvedValue({});
    (cancelSell as jest.Mock).mockResolvedValue({});
    mockCurrenciesList.mockResolvedValue(currencies as any);
  });
  it("sends back the 'transactionId' from the WalletAPI", async () => {
    // GIVEN
    const mockSellPayload = jest.fn();
    mockSellPayload.mockResolvedValue({
      recipientAddress: "0xfff",
      amount: new BigNumber("1.907"),
      binaryPayload: Buffer.from(""),
      signature: Buffer.from(""),
    });
    const sellData: SellInfo = {
      quoteId: "quoteId",
      fromAccountId: "id-1",
      fromAmount: new BigNumber("1.908"),
      feeStrategy: "slow" as FeeStrategy,
      getSellPayload: mockSellPayload,
    };

    // WHEN
    const transactionId = await sdk.sell(sellData);

    // THEN
    expect(mockStartExchange).toBeCalled();
    expect(mockAccountList).toBeCalled();
    expect(mockCompleteSwap).not.toBeCalled();
    expect(mockCompleteFund).not.toBeCalled();
    expect(mockCompleteSell).toBeCalled();
    expect(transactionId).toEqual("TransactionId");
  });

  it("handles the scenario when no getSellPayload is provided", async () => {
    // GIVEN
    // Mock `retrieveSellPayload` since `getSellPayload` is not provided
    (retrieveSellPayload as jest.Mock).mockResolvedValue({
      payinAddress: "0xfff",
      providerSig: {
        payload: Buffer.from(""),
        signature: Buffer.from(""),
      },
    });

    const sellData: SellInfo = {
      quoteId: "quoteId",
      fromAccountId: "id-1",
      fromAmount: new BigNumber("1.908"),
      feeStrategy: "slow" as FeeStrategy,
      toFiat: "EUR",
      rate: 1000,
    };

    // WHEN
    const transactionId = await sdk.sell(sellData);

    // THEN
    expect(mockStartExchange).toBeCalled();
    expect(mockAccountList).toBeCalled();
    expect(mockCompleteSwap).not.toBeCalled();
    expect(mockCompleteFund).not.toBeCalled();
    expect(mockCompleteSell).toBeCalled();
    expect(transactionId).toEqual("TransactionId");
  });

  it("throws error if passed in product type is not supported", async () => {
    console.error = jest.fn();

    const sellData: SellInfo = {
      quoteId: "quoteId",
      fromAccountId: "id-1",
      fromAmount: new BigNumber("1.908"),
      feeStrategy: "SLOW" as FeeStrategy,
      toFiat: "EUR",
      rate: 1000,
      type: ProductType.SWAP,
    };

    await expect(sdk.sell(sellData)).rejects.toThrowError(
      "Product not supported",
    );
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

    const sellData: SellInfo = {
      quoteId: "quoteId",
      fromAccountId: "id-ripple",
      fromAmount: new BigNumber("1.908"),
      feeStrategy: "slow" as FeeStrategy,
      toFiat: "EUR",
      rate: 1000,
    };

    await expect(sdk.sell(sellData)).rejects.toThrow("Missing payinExtraId");
  });
});

describe("fund", () => {
  const currencies: Array<Partial<Currency>> = [
    {
      id: "currency-id-1",
      decimals: 4,
      family: "ethereum",
    },
  ];

  beforeAll(() => {
    (retrieveFundPayload as jest.Mock).mockResolvedValue({
      payinAddress: "",
      quoteId: "fund-id",
      providerSig: {
        payload: "",
        signature: "",
      },
    });
    (confirmFund as jest.Mock).mockResolvedValue({});
    (cancelFund as jest.Mock).mockResolvedValue({});
    mockCurrenciesList.mockResolvedValue(currencies as any);
  });

  it("sends back the 'transactionId' from the WalletAPI", async () => {
    // GIVEN
    const fundData: FundInfo = {
      quoteId: "quoteId",
      fromAccountId: "id-1",
      fromAmount: new BigNumber("1.908"),
      feeStrategy: "SLOW" as FeeStrategy,
    };

    // WHEN
    const transactionId = await sdk.fund(fundData);

    // THEN
    expect(mockStartFund).toBeCalled();
    expect(mockAccountList).toBeCalled();
    expect(mockCompleteSwap).not.toBeCalled();
    expect(mockCompleteSell).not.toBeCalled();
    expect(mockCompleteFund).toBeCalled();
    expect(mockSignAndBroadcast).not.toBeCalled();
    expect(transactionId).toEqual("TransactionId");
  });

  it("throws error if passed in product type is not supported", async () => {
    console.error = jest.fn();

    const fundData: FundInfo = {
      quoteId: "quoteId",
      fromAccountId: "id-1",
      fromAmount: new BigNumber("1.908"),
      feeStrategy: "SLOW" as FeeStrategy,
      type: ProductType.SWAP,
    };

    await expect(sdk.fund(fundData)).rejects.toThrowError(
      "Product not supported",
    );
  });
});

describe("tokenApproval", () => {
  const currencies: Array<Partial<Currency>> = [
    {
      id: "base/erc20/usd_coin",
      decimals: 4,
      type: "TokenCurrency",
      parent: "base",
    },
  ];

  beforeAll(() => {
    (confirmTokenApproval as jest.Mock).mockResolvedValue({});
    (cancelTokenApproval as jest.Mock).mockResolvedValue({});
    mockCurrenciesList.mockResolvedValue(currencies as any);
  });

  it("sends back the 'transactionId' from the WalletAPI", async () => {
    // GIVEN
    const tokenApprovalData: TokenApprovalInfo = {
      orderId: "orderId",
      userAccountId: "id-1",
      smartContractAddress: "id-2",
      approval: {
        amount: new BigNumber("1.908"),
      },
      rawTx: "bishbashbosh",
    };

    // WHEN
    const transactionId = await sdk.tokenApproval(tokenApprovalData);

    // THEN
    expect(mockAccountList).toBeCalled();
    expect(mockCompleteSwap).not.toBeCalled();
    expect(mockCompleteSell).not.toBeCalled();
    expect(mockCompleteFund).not.toBeCalled();
    expect(mockSignAndBroadcast).toBeCalled();
    expect(transactionId).toEqual("TransactionId");
  });

  it("throws error if it us for an unsupported currency", async () => {
    mockCurrenciesList.mockResolvedValue([
      {
        id: "currency-id-2",
        decimals: 4,
        type: "TokenCurrency",
        parent: "notbase",
      },
    ] as any);

    const tokenApprovalData: TokenApprovalInfo = {
      orderId: "orderId",
      userAccountId: "id-2",
      smartContractAddress: "id-2",
      approval: {
        amount: new BigNumber("1.908"),
      },
      rawTx: "bishbashbosh",
    };

    await expect(sdk.tokenApproval(tokenApprovalData)).rejects.toThrowError(
      "Currency not supported",
    );
  });
});

describe("requestAndSignForAccount", () => {
  it("should send back the accountId from the walletAPI", async () => {
    const messageData = {
      message: Buffer.from("Marco"),
      currencyIds: [],
    };

    const response = await sdk.requestAndSignForAccount(messageData);

    expect(mockAccountRequest).toBeCalled();
    expect(mockSignMessage).toBeCalled();
    expect(response).toStrictEqual({
      account: {
        id: "ACCOUNT_ID",
        name: "ACCOUNT_NAME",
        parentAccountId: undefined,
      },
      message: Buffer.from("Polo"),
    });
  });

  it("should throw an RequestAccountError error if account request fails", async () => {
    // GIVEN
    const messageData = {
      message: Buffer.from("Marco"),
      currencyIds: [],
    };

    mockAccountRequest.mockRejectedValueOnce(new Error("Failed"));

    await expect(sdk.requestAndSignForAccount(messageData)).rejects.toThrow(
      RequestAccountError,
    );
  });

  it("should throw an SignError error if sign message fails", async () => {
    // GIVEN
    const messageData = {
      message: Buffer.from("Marco"),
      currencyIds: [],
    };

    mockSignMessage.mockRejectedValueOnce(new Error("Failed"));

    await expect(sdk.requestAndSignForAccount(messageData)).rejects.toThrow(
      SignError,
    );
  });
});
