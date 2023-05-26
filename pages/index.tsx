"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import { useSearchParams } from "next/navigation";
import { ExchangeSDK, FeeStrategy, QueryParams } from "../exchangeSDK";

import { Account } from "@ledgerhq/wallet-api-client";
import BigNumber from "bignumber.js";

const IndexPage = () => {
  const searchParams = useSearchParams();

  const exchangeSDK = useRef<ExchangeSDK>();

  const [allAccounts, setAllAccounts] = useState<Array<Account>>([]);
  const [amount, setAmount] = useState("");
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [feeSelected, setFeeSelected] = useState("");

  const currencyInputRef = useRef(null);

  useEffect(() => {
    // As a demo app, we may provide a providerId for testing purpose.
    const providerId = searchParams.get("provider") || "changelly";

    //-- Retrieve information coming from Deeplink
    setAmount(searchParams.get(QueryParams.FromAmount) ?? "");
    setFromAccount(searchParams.get(QueryParams.FromAccountId) ?? "");
    setToAccount(searchParams.get(QueryParams.ToAccountId) ?? "");
    setFeeSelected(searchParams.get(QueryParams.FeeStrategy) ?? "SLOW");

    // Initiate ExchangeSDK
    exchangeSDK.current = new ExchangeSDK(providerId);

    // Cleanup the Ledger Live API on component unmount
    return () => {
      exchangeSDK.current.disconnect();
      exchangeSDK.current = undefined;
    };
  }, [searchParams]);

  /**
   * Retrieve all user's accounts
   */
  const listAccounts = useCallback(async () => {
    const result = await exchangeSDK.current?.walletAPI.account.list();

    if (result) {
      setAllAccounts(result);
    }
  }, [exchangeSDK]);

  //-- Handle user's inputs
  const handleAmount = (event: React.ChangeEvent<HTMLInputElement>) =>
    setAmount(event.target.value);
  const handleFromAccount = (event: React.ChangeEvent<HTMLInputElement>) =>
    setFromAccount(event.target.value);
  const handleToAccount = (event: React.ChangeEvent<HTMLInputElement>) =>
    setToAccount(event.target.value);
  const handleFee = (event: React.ChangeEvent<HTMLInputElement>) =>
    setFeeSelected(event.target.value);

  //-- TEST
  const onUninstallCoin = async () => {
    const currency = currencyInputRef.current.value;
    const result = await exchangeSDK.current.walletAPI.account
      .request({
        currencyIds: currency !== "" ? [currency] : undefined,
      })
      .catch((err: Error) => console.error("onUninstallCoin", err));
    console.log("onUninstallCoin result:", result);
  };

  /**
   * Handle user's swap validation
   */
  const onSwap = useCallback(() => {
    const quoteId =
      decodeURIComponent(searchParams.get(QueryParams.QuoteId)) ||
      "84F84F76-FD3A-461A-AF6B-D03F78F7123B";
    exchangeSDK.current
      .swap({
        quoteId,
        fromAccountId: fromAccount,
        toAccountId: toAccount,
        fromAmount: new BigNumber(amount),
        feeStrategy: feeSelected as FeeStrategy,
      })
      .catch((err) => {
        console.error(
          "%cExchangeSDK error:",
          "background: #7f0000; color: #fff",
          err
        );
      });
  }, [amount, fromAccount, toAccount, feeSelected, searchParams]);

  return (
    <Layout title="Swap Web App Example">
      <h1>Hello I am a Swap Web app</h1>

      <div>
        <button onClick={listAccounts}>{"List accounts"}</button>
      </div>
      <div style={{ backgroundColor: "#999999" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>ID</th>
              <th>Currency</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {allAccounts.map((elt) => {
              return (
                <tr key={elt.id}>
                  <td>{elt.name}</td>
                  <td>{elt.id}</td>
                  <td>{elt.currency}</td>
                  <td>{elt.address}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <label htmlFor="amount" style={{ color: "#dddddd" }}>
          {"Amount"}
        </label>
        <input name="amount" onChange={handleAmount} value={amount} />
      </div>
      <div>
        <label htmlFor="fee" style={{ color: "#dddddd" }}>
          {"Fee"}
        </label>
        <div onChange={handleFee} style={{ color: "#dddddd" }}>
          <input
            type="radio"
            name="fee"
            value="SLOW"
            defaultChecked={feeSelected === "SLOW"}
          />{" "}
          SLOW
          <input
            type="radio"
            name="fee"
            value="MEDIUM"
            defaultChecked={feeSelected === "MEDIUM"}
          />{" "}
          MEDIUM
          <input
            type="radio"
            name="fee"
            value="FAST"
            defaultChecked={feeSelected === "FAST"}
          />{" "}
          FAST
        </div>
      </div>
      <div>
        <label htmlFor="fromAccount" style={{ color: "#dddddd" }}>
          {"From Account"}
        </label>
        <input
          name="fromAccount"
          onChange={handleFromAccount}
          value={fromAccount}
        />
        <label htmlFor="toAccount" style={{ color: "#dddddd" }}>
          {"To Account"}
        </label>
        <input name="toAccount" onChange={handleToAccount} value={toAccount} />
      </div>

      <div>
        <button onClick={() => onSwap()}>{"Execute swap"}</button>
      </div>

      <div>
        <input name="currency" ref={currencyInputRef} />
        <button onClick={onUninstallCoin}>{"Ask for currency account"}</button>
      </div>
    </Layout>
  );
};

export default IndexPage;
