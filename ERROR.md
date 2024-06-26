# Error Management

## General flow

```mermaid
stateDiagram
  classDef badBadEvent fill:#f00,color:white,font-weight:bold,stroke-width:2px,stroke:yellow

  state startswap_state <<choice>>
  state retrievepayload_state <<choice>>
  state completeswap_state <<choice>>

  [*] --> StartSwap
  StartSwap --> startswap_state
  startswap_state --> RetrievePayload
  startswap_state --> NonceStepError

  RetrievePayload --> retrievepayload_state
  retrievepayload_state --> CompleteSwap
  retrievepayload_state --> PayloadStepError

  CompleteSwap --> completeswap_state
  completeswap_state --> [*]
  completeswap_state --> SignatureStepError

  class NonceStepError badBadEvent
  class PayloadStepError badBadEvent
  class SignatureStepError badBadEvent
```

## Error objects

The ExchangeSDK can throw differents kind of errors:

- ExchangeError: generic exchange error
- NotEnoughFunds: if the user has not enough funds to start the swap transaction
- NonceStepError: if an error occurred during the _nonce_ generation
- PayloadStepError: if an error occurred during the payload retrieve flow (communication with Ledger and the Provider backends)
- SignatureStepError: if an error occured during the signature flow
- ListAccountError: unable to retrieve account list
- ListCurrencyError: unable to retrieve list currency
- UnknownAccountError: unable to find from/to account in user account/currency list
- PayinExtraIdError: transactions sometimes require an extra identifier to successfully process a transaction. This identifier is known as payinExtraId in our system. For XLM (Stellar Lumens) a `memoValue` required for transaction reference. For XRP, a destination `tag` is needed to identify the recipient in shared wallets.

All those errors (except _NotEnoughFunds_) embed the root error/cause.

## Contributors

For more details on the whole error flow, with details on Ledger Live, go to the [dedicated confluence page](https://ledgerhq.atlassian.net/wiki/spaces/PTX/pages/4144530320/Errors).
