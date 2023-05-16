"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import { useSearchParams } from "next/navigation";
import { ExchangeSDK } from "../exchangeSDK";
import {
  Account,
  WalletAPIClient,
  WindowMessageTransport,
} from "@ledgerhq/wallet-api-client";

const IndexPage = (props) => {
  const searchParams = useSearchParams();

  const exchangeSDK = useRef<ExchangeSDK>();

  const [allAccounts, setAllAccounts] = useState<Array<Account>>([]);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");

  const provider = searchParams.get("provider");

  useEffect(() => {
    const providerId = provider || "changelly";
    exchangeSDK.current = new ExchangeSDK(providerId);

    // Cleanup the Ledger Live API on component unmount
    return () => {
      exchangeSDK.current.disconnect();
      exchangeSDK.current = undefined;
    };
  }, []);

  const listAccounts = async () => {
    console.log("Search for all accounts");
    const result = await exchangeSDK.current?.walletAPI.account.list();

    console.log("Result:", result);

    console.log("All accounts:", allAccounts);
    if (result) {
      setAllAccounts(result);
    }
    console.log("All accounts:", allAccounts);
  };

  const handleFromAccount = (event: React.ChangeEvent<HTMLInputElement>) =>
    setFromAccount(event.target.value);
  const handleToAccount = (event: React.ChangeEvent<HTMLInputElement>) =>
    setToAccount(event.target.value);

  const onSwap = useCallback(() => {
    console.log("provider", provider);

    exchangeSDK.current.swap({
      quoteId: "84F84F76-FD3A-461A-AF6B-D03F78F7123B",
      fromAddressId: fromAccount,
      toAddressId: toAccount,
      fromAmount: BigInt("100"),
      toAmount: BigInt("100"),
      fromCurrency: "ethereum/erc20/usd__coin",
      toCurrency: "bitcoin",
      feeStrategy: "SLOW",
      provider,
    });
  }, [provider]);

  // const transaction = searchParams.get("transaction");
  const exchangeRate = searchParams.get("exchangeRate");

  const onLLSwap = useCallback(() => {
    const fromCurrency = searchParams.get("fromCurrency");
    const toCurrency = searchParams.get("toCurrency");
    const toAddressId = searchParams.get("toAddressId");
    const fromAddressId = searchParams.get("fromAddressId");
    const fromAmount = searchParams.get("fromAmount");

    const params = {
      provider,
      fromCurrency,
      toCurrency,
      fromAddressId,
      toAddressId,
      fromAmount,
      feeStrategy: "SLOW", // What happend if the fees are personalise
    };

    const exchange = new ExchangeSDK(provider);
    exchangeSDK.current.swap(params);
  }, [provider]);

  return (
    <Layout title="Swap Web App Example">
      <h1>Hello I am a Swap Web app</h1>

      <div>
        <button onClick={listAccounts}>{"List accounts"}</button>
      </div>
      <div style={{ backgroundColor: "#999999" }}>
        {allAccounts.map((elt) => {
          return (
            <div key={elt.id}>
              {elt.name}: {elt.id}
            </div>
          );
        })}
      </div>

      <div>
        <label htmlFor="fromAccount" style={{ color: "#dddddd" }}>
          {"From Account"}
        </label>
        <input name="fromAccount" onChange={handleFromAccount} />
        <label htmlFor="toAccount" style={{ color: "#dddddd" }}>
          {"To Account"}
        </label>
        <input name="toAccount" onChange={handleToAccount} />
      </div>

      <div>
        <button onClick={() => onSwap()}>{"Execute swap"}</button>
      </div>

      <div>
        <button onClick={() => onLLSwap()}>{"Execute swap from LL"}</button>
      </div>
    </Layout>
  );
};

export default IndexPage;
