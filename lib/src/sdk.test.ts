import { Account, Currency } from "@ledgerhq/wallet-api-client";
import { ExchangeModule } from "@ledgerhq/wallet-api-client/lib/modules/Exchange";
import { AccountModule } from "@ledgerhq/wallet-api-client/lib/modules/Account";
import { CurrencyModule } from "@ledgerhq/wallet-api-client/lib/modules/Currency";
import BigNumber from "bignumber.js";
import { retrievePayload, confirmSwap } from "./api";
import { ExchangeSDK, FeeStrategy } from "./sdk";
import { WalletAPIClient } from "@ledgerhq/wallet-api-client/lib/WalletAPIClient";

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
});
