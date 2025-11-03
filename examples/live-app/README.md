# ExchangeSDK Test App

This project provides a **manual testing environment** for all flows within the **ExchangeSDK**. It is designed to be linked with the **Ledger Wallet App** or used independently via the **Wallet API simulator**.

---

## 🧩 Available Scripts

| Command              | Description                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `pnpm dev`           | Runs the app in **development mode**, linked with the Ledger Wallet App using the manifest file. |
| `pnpm dev:simulator` | Runs the app in **simulator mode**, using the Wallet API simulator (no Ledger Wallet required).  |
| `pnpm build`         | Builds the app using Next.js with Turbopack.                                                     |
| `pnpm start`         | Starts the production build.                                                                     |
| `pnpm lint`          | Runs ESLint to check for code issues.                                                            |

---

## 🔗 Linking with Ledger Wallet App

To test your flows directly inside the **Ledger Wallet App**:

1. Ensure your Ledger Wallet developer environment is set up.
2. Link this app using the manifest file: manifests/manifest-dev.json
3. Run the app in development mode:

```bash
pnpm dev
```

4. The Ledger Wallet will use this manifest to connect to your local dev server.

## 🧪 Running in Simulator Mode

If you want to test the app without the Ledger Wallet:

```bash
pnpm dev:simulator
```

This mode enables the Wallet API Simulator, allowing you to mock wallet behavior and test ExchangeSDK flows in isolation

## 🔄 Adding New Flows

When you create a new flow in the ExchangeSDK, it’s recommended to add it here for manual testing.
This helps ensure all user interactions and end-to-end flows work as expected before integration.
