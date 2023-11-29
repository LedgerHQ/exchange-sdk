# Exchange SDK

## About
The goal of this SDK is to provide an easy way to interact with Ledger Live for exchange methods (example: Swap).

This LiveApp is an example of how to interact with ExchangeSDK to ask user to validate a swap transaction.

To have more details on how the swap features is working in Ledger Live, go to [Ledger's dev portal](https://developers.ledger.com/docs/swap/howto/providers-liveapp/).

## Installation
```bash
npm install @ledgerhq/exchange-sdk
```

## Prerequisite
### LiveApp Settings
Your LiveApp will need to have the following permissions in your `manifest.json` file:
```json
  "permissions": [
    "account.list",
    "account.request",
    "currency.list",
    "exchange.start",
    "exchange.complete"
  ]
```

## Usage
First you need an instance of the ExchangeSDK:
```js
import { ExchangeSDK, QueryParams } from "@ledgerhq/exchange-sdk";

// The providerId has to be set with coordination with Ledger's team. It is your unique identifier when interacting with Ledger Live.
const exchangeSDK = new ExchangeSDK(providerId);
```

When your LiveApp is called by Ledger Live through a deeplink, it will receive some informations. Check [QueryParams type](https://github.com/LedgerHQ/exchange-sdk/blob/main/lib/src/liveapp.ts) to have more details about it.

Then you can call the swap method in order to start a new swap process.
```js
// Those are parameters that given through deeplink.
exchangeSDK.swap({
  quoteId,
  fromAccountId,
  toAccountId,
  fromAmount,
  feeStrategy,
  customFeeConfig,
  rate,
});
```

You can update some of them (ex: `quoteId`), if your interface offers the user to change those parameters.
Typically, the `quoteId` is an information coming from your system, so you can update its value if during your interaction with the user it has more mearning to do so.

### Using WalletAPI methods
The ExchangeSDK is simple wrapper around the [WalletAPI](https://github.com/LedgerHQ/wallet-api). However, you cannot instanciate twice the WalletAPI client inside you LiveApp.

So if you want to use some methods provided by WalletAPI in your LiveApp, you have the choice:
 * use the WalletAPI client instance provided by the ExchangeSDK
 * provide a WalletAPI client instance to the ExchangeSDK

#### Using WalletAPI client instance
Once you have your ExchangeSDK instance, you can call [WalletAPI methods](https://github.com/LedgerHQ/wallet-api/tree/main/packages/client) through its `walletAPI` property:
```js
exchangeSDK.walletAPI.account.list()
```


#### Providing WalletAPI client instance
If you already have a WalletAPI client instance, you can provide it when instanciating the ExchangeSDK:
```js
const exchangeSDK = new ExchangeSDK(providerId, undefined, myWalletAPI);
```

## What to look at the example app
### /example/src/pages/index.tsx
`useEffect` is used when the LiveApp is launch.
It catches the deeplink query params provided to populate the form inputs.
Then it instanciate an ExchangeSDK with a default `providerId`.

`onSwap` gets all form inputs info to send them to the ExchangeSDK.
For testing purpose, a default `quoteId` is provided, but in Production this query param is mandatory.

## Why
`lib/package.json` has 2 pre/post script on bump version. This is due to an [NPM issue](https://github.com/npm/npm/issues/9111).
