"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import { useSearchParams } from "next/navigation";
import { ExchangeSDK, QueryParams } from "@ledgerhq/exchange-sdk";

import { Account } from "@ledgerhq/wallet-api-client";
import BigNumber from "bignumber.js";
import { useHashState } from "../hooks/useHashState";
import { HashSchemaType } from "../schemas/HashSchema";

export const InternalParams = {
  Provider: "provider",
};

const IndexPage = () => {
  const searchParams = useSearchParams();
  const [hashState, setHashState] = useHashState();

  const exchangeSDK = useRef<ExchangeSDK>();

  const [allAccounts, setAllAccounts] = useState<Array<Account>>([]);

  const currencyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initiate ExchangeSDK
    if (hashState?.provider) {
      exchangeSDK.current = new ExchangeSDK(hashState.provider);
    }

    // Cleanup the Ledger Live API on component unmount
    return () => {
      exchangeSDK.current?.disconnect();
      exchangeSDK.current = undefined;
    };
  }, [searchParams, hashState?.provider]);

  /**
   * Retrieve all user's accounts
   */
  const listAccounts = useCallback(async () => {
    const result = await exchangeSDK.current?.walletAPI.account.list();

    if (result) {
      setAllAccounts(result);
    }
  }, [exchangeSDK]);

  //-- TEST
  const onUninstallCoin = async () => {
    const currency = currencyInputRef.current?.value;
    const result = await exchangeSDK.current?.walletAPI.account
      .request({
        currencyIds:
          currency !== "" && currency !== undefined ? [currency] : undefined,
      })
      .catch((err: Error) => console.error("onUninstallCoin", err));
    console.log("onUninstallCoin result:", result);
  };

  /**
   * Handle user's swap validation
   */
  const onSwap = useCallback(() => {
    const quoteIdParam = searchParams.get(QueryParams.QuoteId);
    const quoteId = quoteIdParam
      ? decodeURIComponent(quoteIdParam)
      : "84F84F76-FD3A-461A-AF6B-D03F78F7123B";

    exchangeSDK.current
      ?.swap({
        quoteId,
        fromAccountId: hashState?.fromAccountId ?? "",
        toAccountId: hashState?.toAccountId ?? "",
        fromAmount: hashState?.fromAmount ?? BigNumber(0),
        feeStrategy: hashState?.feeStrategy ?? "SLOW",
      })
      .catch((err) => {
        console.error(
          "%cExchangeSDK error:",
          "background: #7f0000; color: #fff",
          err
        );
      });
  }, [
    searchParams,
    hashState?.fromAccountId,
    hashState?.toAccountId,
    hashState?.fromAmount,
    hashState?.feeStrategy,
  ]);

  return (
    <Layout title="Swap Web App Example">
      <h1>Hello I am a Swap Web app</h1>

      <div>
        <button onClick={listAccounts}>{"List accounts"}</button>
      </div>
      <div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {allAccounts.map((elt) => {
              return (
                <tr key={elt.id}>
                  <td>{elt.name}</td>
                  <td>{elt.id}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <form
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "13px",
          backgroundColor: "bisque",
          padding: "13px",
        }}
        onChange={(e: React.ChangeEvent<HTMLFormElement>) => {
          const name = e.target.name as keyof HashSchemaType;
          const value = e.target.value;

          console.log(
            "%cindex.tsx line:135 name, value",
            "color: #007acc;",
            name,
            value
          );

          if (
            ["fromAmount", "initFeeTotalValue", "rate", "feeStrategy"].includes(
              name
            )
          ) {
            setHashState({
              [name]: BigNumber(value),
            });
          }
          setHashState({
            [name]: value,
          });
        }}
      >
        <fieldset>
          <label htmlFor="fromAmount">Amount</label>
          <input
            id="fromAmount"
            name="fromAmount"
            value={hashState?.fromAmount.toString()}
          />
        </fieldset>
        <fieldset
          style={{ display: "flex", flexDirection: "column", gap: "13px" }}
        >
          <legend>Fee</legend>
          <div>
            <label htmlFor="feeStrategy-slow">SLOW</label>
            <input
              id="feeStrategy-slow"
              type="radio"
              name="feeStrategy"
              value="SLOW"
              defaultChecked={hashState?.feeStrategy === "SLOW"}
            />
          </div>
          <div>
            <label htmlFor="feeStrategy-medium">MEDIUM</label>
            <input
              id="feeStrategy-medium"
              type="radio"
              name="feeStrategy"
              value="MEDIUM"
              defaultChecked={hashState?.feeStrategy === "MEDIUM"}
            />
          </div>
          <div>
            <label htmlFor="feeStrategy-fast">FAST</label>
            <input
              id="feeStrategy-fast"
              type="radio"
              name="feeStrategy"
              value="FAST"
              defaultChecked={hashState?.feeStrategy === "FAST"}
            />
          </div>
        </fieldset>
        <fieldset
          style={{ display: "flex", flexDirection: "column", gap: "13px" }}
        >
          <div>
            <label htmlFor="fromAccountId">From Account</label>
            <input
              id="fromAccountId"
              name="fromAccountId"
              value={hashState?.fromAccountId}
            />
          </div>
          <div>
            <label htmlFor="toAccountId">To Account</label>
            <input
              id="toAccountId"
              name="toAccountId"
              value={hashState?.toAccountId}
            />
          </div>
        </fieldset>
      </form>

      <div>
        <button onClick={() => onSwap()}>Execute swap</button>
      </div>

      <div>
        <input name="currency" ref={currencyInputRef} />
        <button onClick={onUninstallCoin}>{"Ask for currency account"}</button>
      </div>
    </Layout>
  );
};

export default IndexPage;
