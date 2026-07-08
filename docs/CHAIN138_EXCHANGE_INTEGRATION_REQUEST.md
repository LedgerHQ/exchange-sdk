# Chain 138 (DeFi Oracle Meta Mainnet) — Exchange integration request

This document supports **Batch 5** of the LedgerHQ Chain 138 adoption track. Exchange surfaces (`exchange-sdk`, `app-exchange`, `exchange-tool`) require a **Ledger-assigned `providerId`** and signed partner agreement before production enablement.

## Chain specification

| Field | Value |
|-------|--------|
| Name | DeFi Oracle Meta Mainnet |
| Chain ID | 138 (0x8a) |
| Native asset | ETH (18 decimals) |
| RPC | `https://rpc.d-bis.org` |
| Explorer | `https://blockscout.defi-oracle.io` |
| EVM | EIP-155 / EIP-1559 |
| Derivation | `44'/60'` |

## Live DeFi venues on Chain 138 (for swap routing evaluation)

| Venue | Contract | Role |
|-------|----------|------|
| DODO PMM (Stack A) | `0x86ADA6Ef91A3B450F89f2b751e93B1b7A3218895` | Primary PMM integration |
| Uniswap V3 SwapRouter02 | `0xde9cD8ee2811E6E64a41D5F68Be315d33995975E` | Official native router |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` | Token approvals |

## Prerequisites before Exchange SDK go-live

1. **Ledger Live currency** — `defi_oracle_meta_mainnet` in `@ledgerhq/cryptoassets` (see ledger-live PR track).
2. **Ledger partnership** — blockchain integration form: https://tally.so/r/mORpv8
3. **Provider onboarding** — coordinate `providerId` with Ledger exchange team per [official docs](https://developers.ledger.com/docs/ledger-live/exchange).

## Manifest permissions (unchanged)

Exchange dApps must request the standard permissions documented in the root README (`account.list`, `currency.list`, `custom.exchange.*`, etc.).

## Contact

DeFi Oracle / DBIS integration — reference Chain ID **138** and this file when opening the exchange partner thread with Ledger.
