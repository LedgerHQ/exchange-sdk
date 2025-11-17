import { ExchangeSDK } from "../../src";
import {
  getSimulatorTransport,
  profiles,
} from "@ledgerhq/wallet-api-simulator";

describe("ExchangeSDK.requestAndSignForAccount", () => {
  let sdk: ExchangeSDK;

  beforeEach(() => {
    jest.clearAllMocks();

    const transport = getSimulatorTransport(profiles.STANDARD);

    sdk = new ExchangeSDK("provider-id", { transport });
  });

  it("should request and sign for an account successfully", async () => {
    const result = await sdk.requestAndSignForAccount({
      message: Buffer.from("test message"),
      currencyIds: ["bitcoin"],
    });

    expect(result.account.id).toBe("account-btc-1");
    expect(result.message.toString()).toBe("0x123456789123456789");
  });
});
