import { TrackingSdkFactory, TrackingSdk } from "@ledgerhq/tracking-sdk"; // Your new lib
import { WalletAPIClient } from "@ledgerhq/wallet-api-client";

export class TrackingService {
  public client: TrackingSdk;
  public trackEvent: TrackingSdk["trackEvent"];

  private walletAPI: WalletAPIClient;

  constructor({
    walletAPI,
    environment = "staging",
  }: {
    walletAPI: WalletAPIClient;
    environment?: "staging" | "preproduction" | "production";
  }) {
    this.walletAPI = walletAPI;
    this.client = TrackingSdkFactory.getInstance({
      environment,
    });
    this.updateUserId();
    this.trackEvent = this.client.trackEvent.bind(this.client);
  }

  updateUserId() {
    this.walletAPI.wallet.userId().then((userId) => {
      this.client.identify(userId);
    });
  }
}
