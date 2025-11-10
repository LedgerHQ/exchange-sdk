# Exchange SDK

## About

The goal of this SDK is to provide an easy way to interact with Ledger Live for exchange methods (example: Swap).

[This LiveApp](https://github.com/LedgerHQ/exchange-sdk/blob/main/example) is an example of how to interact with ExchangeSDK to ask user to validate a swap transaction.

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
    "custom.exchange.error",
    "custom.exchange.start",
    "custom.exchange.complete"
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
  toNewTokenId,
});
```

You can update some of them (ex: `quoteId`), if your interface offers the user to change those parameters.
Typically, the `quoteId` is an information coming from your system, so you can update its value if during your interaction with the user it has more mearning to do so.

#### toNewTokenId

When user swaps to a token, your app will receive toNewTokenId as a query parameter. In this case, it should be passed to swap method, without any modification.
When user swaps to a native coin, this parameter won't be present, and you should not use this parameter neither in the swap method.

### Using WalletAPI methods

The ExchangeSDK is a simple wrapper around the [WalletAPI](https://github.com/LedgerHQ/wallet-api). However, you cannot instantiate the WalletAPI client twice inside your LiveApp.

If you want to use a method(s) provided by WalletAPI in your Live App, you have two options:

- use the WalletAPI client instance provided by the ExchangeSDK or
- pass the WalletAPI client instance as the second parameter when invoking the ExchangeSDK()

#### Option 1: Having a direct dependency with `exchange-sdk` only

Once you have your ExchangeSDK instance, you can call [WalletAPI methods](https://github.com/LedgerHQ/wallet-api/tree/main/packages/client) through its `walletAPI` property:

```js
exchangeSDK.walletAPI.account.list();
```

#### Option 2: Having a direct dependency with `wallet-api` & `exchange-sdk`

If you already have a WalletAPI client instance, you can provide it when instanciating the ExchangeSDK:

```js
const exchangeSDK = new ExchangeSDK(providerId, undefined, myWalletAPI);
```

## The example app

### /example/src/pages/index.tsx

`useEffect` is used when the LiveApp is launch.
It catches the deeplink query params provided to populate the form inputs.
Then it instanciate an ExchangeSDK with a default `providerId`.

`onSwap` gets all form inputs info to send them to the ExchangeSDK.
For testing purpose, a default `quoteId` is provided, but in Production this query param is mandatory.

## Testing

You can test your integration by setting a custom url for the backend called by this SDK.
Instanciate the exchangeSDK this way:

```js
const exchangeSDK = new ExchangeSDK(providerId, {
  customUrl: "https://custom-url.swap.test",
});
```

## Why

`lib/package.json` has 2 pre/post script on bump version. This is due to an [NPM issue](https://github.com/npm/npm/issues/9111).
