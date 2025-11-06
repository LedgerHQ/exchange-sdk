# 🧭 @ledgerhq/tracking-sdk

A lightweight TypeScript SDK for consistent, type-safe event tracking across Ledger applications.

This SDK provides a unified interface for sending structured analytics events to Segment (or other destinations), with environment support for staging and production.

## ✨ Features

- 🔒 **Type-safe events** – ensures only valid events and parameters are sent
- 🌍 **Environment-aware** – easily switch between staging and production
- ⚙️ **Pluggable tracking strategy** – choose frontend or backend delivery
- 🧩 **Segment integration ready**

## 📦 Installation

```bash
pnpm add @ledgerhq/tracking-sdk
```

or (for local development)

```bash
# Inside your tracking-sdk repo
pnpm build
pnpm link --global

# In your app repo
pnpm link --global @ledgerhq/tracking-sdk
```

## 🚀 Usage

```ts
import { TrackingSdkFactory } from "@ledgerhq/tracking-sdk";

const trackingSdk = TrackingSdkFactory.getInstance({
  environment: "staging", // or 'production'
  providerSessionId: "xxxx-xxxx-xxxx-xxxx", // optional but must be provided if you have one available
});
```
