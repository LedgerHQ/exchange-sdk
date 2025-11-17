# Ledger Exchange SDK

The Exchange SDK enables exchange providers to integrate their services directly into Ledger Wallet as a **dApp**. This kit provides the necessary tools, methods, and guidelines to create a seamless and secure exchange experience for Ledger users.

For a complete overview of the exchange flows and integration patterns, please see the **[official Ledger developer documentation](https://developers.ledger.com/docs/ledger-live/exchange)**.

## 🚀 Key Features

- **Wallet Integration:** Wraps the [Ledger Wallet API](https://github.com/LedgerHQ/wallet-api) to provide easy access to user accounts and wallet information.
- **Analytics:** Includes a tracking module to send standardized analytics events to Ledger's infrastructure.
- **App Control:** Allows you to programmatically manage the dApp lifecycle, such as closing the app.
- **Backend Flexibility:** Supports pointing the SDK to a custom backend for development and testing.

## 🔧 Getting Started

### 1. Installation

Install the package using npm:

```bash
npm install @ledgerhq/exchange-sdk
```

### 2. Prerequisites: dApp Manifest

Your dApp `manifest.json` file must include the following permissions to interact with Ledger Wallet and the user's wallet:

```json copy
"permissions": [
  "account.list",
  "account.request",
  "currency.list",
  "custom.exchange.error",
  "custom.exchange.start",
  "custom.exchange.complete",
  "custom.close",
  "wallet.info"
]
```

## Usage

### SDK Initialization

First, import and initialize the ExchangeSDK with your unique providerId.

Note: The providerId is your unique identifier and must be set in coordination with the Ledger team.

```js copy
import { ExchangeSDK } from "@ledgerhq/exchange-sdk";

const providerId = "your-provider-id"; // Provided by the Ledger team
const exchangeSDK = new ExchangeSDK(providerId);
```

## Core API Methods

Here are the primary methods you will use to build your integration.

### Swap

Full documentation on the [developer portal](https://developers.ledger.com/docs/ledger-live/exchange/swap/providers-liveapp)

```js copy
exchangeSDK.swap({
  quoteId: "1234",
  fromAccountId: "07AB5930-C73A-433F-A2FA-920640AF3A02",
  toAccountId: "76A239EB-1C2A-4237-B942-CA87472106EB",
  fromAmount: "12.3",
  feeStrategy: "SLOW",
  rate: 0.7555,
});
```

### Sell

Full documentation on the [developer portal](https://developers.ledger.com/docs/ledger-live/exchange/sell/providers-liveapp)

```js copy
exchangeSDK.sell({
  quoteId: "123abc",
  fromAccountId: "97f06be9-6fb2-5da3-be71-4e762ed6e115",
  fromAmount: new BigNumber(1),
  toFiat: "EUR",
  rate: 66564,
  type: "SELL",
});
```

### Fund

Full documentation on the [developer portal](https://developers.ledger.com/docs/ledger-live/exchange/card/fund-card/providers-liveapp)

```js copy
exchangeSDK.fund({
  orderId: "123abc",
  fromAccountId: "97f06be9-6fb2-5da3-be71-4e762ed6e115",
  fromAmount: new BigNumber(1),
  type: "card",
});
```

### Analytics Event Tracking

This is the primary method used to send analytics events from your application to Ledger's tracking infrastructure. The SDK handles adding necessary metadata (like user ID) automatically.

```js copy
exchangeSDK.tracking.trackEvent("event_name", {
  property1: "value1",
  property2: "value2",
});
```

### Close dApp

This method allows you to programmatically close the dApp from within your application. This is useful for redirecting the user back to Ledger Wallet after a completed action.

```js copy
exchangeSDK.closeLiveApp();
```

## Advanced Usage

### Using the WalletAPI Client

The ExchangeSDK is a wrapper around the [Ledger Wallet API](https://github.com/LedgerHQ/wallet-api/tree/main/packages/client). You cannot instantiate the WalletAPI client twice inside your dApp. If you need to call WalletAPI methods directly, you have two options:

### Option 1: Access the SDK's WalletAPI Instance (Recommended)

Once you have an `ExchangeSDK` instance, you can access the full WalletAPI client through its `walletAPI` property:

```js copy
// Example: Requesting accounts for the user
exchangeSDK.walletAPI.account.list();
```

### Option 2: Provide Your Own WalletAPI Instance

If your application already has its own WalletAPI client instance, you can pass it to the ExchangeSDK during initialization:

```js copy
import { WalletAPIClient } from "@ledgerhq/wallet-api-client";
import { ExchangeSDK } from "@ledgerhq/exchange-sdk";

const myWalletAPI = new WalletAPIClient();
const providerId = "your-provider-id";

// Pass your instance in the options object
const exchangeSDK = new ExchangeSDK(providerId, { walletAPI: myWalletAPI });
```

### Using a Custom Backend

For testing or development, you can instruct the SDK to send its requests to a custom backend URL.

```js copy
const exchangeSDK = new ExchangeSDK(providerId, {
  customUrl: "https://your-custom-backend.test",
});
```

## 🧪 Examples & Testing

The `examples` folder in this repository contains sample dApps that demonstrate various SDK features.

- live-app: The primary example app used to test multiple flows and utilities. It can be run independently using the Wallet API Simulator or as a dApp within Ledger Wallet.

- Legacy Apps: Older swap and sell apps are also present but are no longer maintained. We recommend using the main live-app example as your primary reference.

For more details on running the examples, please see the [README](./examples/live-app/) within the examples/live-app folder.
