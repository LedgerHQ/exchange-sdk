import {
  Account,
  Currency,
  WalletAPIClient,
} from "@ledgerhq/wallet-api-client";
import { ExchangeModule } from "@ledgerhq/wallet-api-client/lib/modules/Exchange";
import { AccountModule } from "@ledgerhq/wallet-api-client/lib/modules/Account";
import { CurrencyModule } from "@ledgerhq/wallet-api-client/lib/modules/Currency";
import BigNumber from "bignumber.js";
import { retrievePayload, confirmSwap } from "./api";
import { ExchangeSDK, FeeStrategy } from "./sdk";

jest.mock("./api");

describe("swap", () => {
  it("sends back the 'transactionId' from the WalletAPI", async () => {
    // GIVEN
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
    const currencies: Array<Partial<Currency>> = [
      {
        id: "currency-id-1",
        decimals: 4,
      },
    ];
    const mockAccountList = jest
      .spyOn(AccountModule.prototype, "list")
      .mockResolvedValue(accounts as Array<Account>);
    jest
      .spyOn(CurrencyModule.prototype, "list")
      .mockResolvedValue(currencies as any);
    jest
      .spyOn(ExchangeModule.prototype, "start")
      .mockResolvedValue("DeviceTransactionId");
    jest
      .spyOn(ExchangeModule.prototype, "completeSwap")
      .mockResolvedValue("TransactionId");
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
    expect(mockAccountList).toBeCalled();
    expect(transactionId).toEqual("TransactionId");
  });
});
