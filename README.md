# Swap LiveApp

## Purpose
This LiveApp is an example of how to interact with ExchangeSDK to ask user to validate a swap transaction.

## What to look at
### /pages/index.tsx
`useEffect` is used when the LiveApp is launch.
It catches the deeplink query params provided to populate the form inputs.
Then it instanciate an ExchangeSDK with a default `providerId`.

`onSwap` gets all form inputs info to send them to the ExchangeSDK.
For testing purpose, a default `quoteId` is provided, but in Production this query param is mandatory.

### /exchangeSDK/index.ts
This file is the only one you need to depends on.
It exports all public interface to the ExchangeSDK.