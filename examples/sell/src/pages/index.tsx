"use client";

import axios from "axios";

import { useCallback, useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import { useSearchParams } from "next/navigation";
import { ExchangeSDK, FeeStrategy, QueryParams } from "@ledgerhq/exchange-sdk";

import { Account } from "@ledgerhq/wallet-api-client";
import BigNumber from "bignumber.js";

export const InternalParams = {
  Provider: "provider",
  Rate: "rate",
};

const IndexPage = () => {
  const searchParams = useSearchParams();

  const exchangeSDK = useRef<ExchangeSDK>();

  const [allAccounts, setAllAccounts] = useState<Array<Account>>([]);
  const [quoteId, setQuoteId] = useState();
  const [amount, setAmount] = useState("");
  const [fromAccount, setFromAccount] = useState("");
  const [feeSelected, setFeeSelected] = useState("slow");
  const [customFeeConfig, setCustomFeeConfig] = useState({});

  const currencyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // As a demo app, we may provide a providerId for testing purpose.
    let providerId = "mercuryo";

    //-- Retrieve information coming from Deeplink
    for (const entry of searchParams.entries()) {
      const [key, value] = entry;
      if (value && value !== "undefined") {
        switch (key) {
          case InternalParams.Provider:
            providerId = value;
            break;
          case QueryParams.QuoteId:
            setQuoteId(value);
            break;
          case QueryParams.FromAmount:
            setAmount(value);
            break;
          case QueryParams.FromAccountId:
            setFromAccount(value);
            break;
          case QueryParams.FeeStrategy:
            setFeeSelected(value);
            break;
          case QueryParams.CustomFeeConfig:
            setCustomFeeConfig(JSON.parse(value));
            break;
        }
      }
    }

    // Initiate ExchangeSDK
    exchangeSDK.current = new ExchangeSDK(providerId);

    // Cleanup the Ledger Live API on component unmount
    return () => {
      exchangeSDK.current?.disconnect();
      exchangeSDK.current = undefined;
    };
  }, [searchParams]);

  /**
   * Retrieve init fee currency example
   */
  const getInitFeeCurrency = useCallback(async () => {
    const accounts = await exchangeSDK.current?.walletAPI.account.list();
    const account = accounts.find((acc) => acc.id === fromAccount);
    const result = await exchangeSDK.current?.walletAPI.currency.list({
      currencyIds: [account.currency],
    });
    const { parent: parentId } = result;
    if (parentId) {
      const parentCurrency = await exchangeSDK.current?.walletAPI.currency.list(
        {
          currencyIds: [parentId.currency],
        },
      );
      console.log("initFeeCurrency (token)", parentCurrency);
    } else {
      console.log("initFeeCurrency (coin)", result);
    }
  }, [fromAccount]);

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
  const handleFee = (event: React.ChangeEvent<HTMLInputElement>) =>
    setFeeSelected(event.target.value);

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
  const onSell = useCallback(() => {
    exchangeSDK.current
      ?.sell({
        quoteId,
        fromAccountId: fromAccount,
        fromAmount: new BigNumber(amount),
        feeStrategy: feeSelected as FeeStrategy,
        customFeeConfig,
        getSellPayload: async (nonce, address, amount) => {
          const result: {
            data: {
              recipientAddress: string;
              amount: string;
              binaryPayload: string;
              signature: string;
            };
          } = await axios({
            method: "GET",
            url: `http://localhost:3000/api/sell?nonce=${nonce}&amount=${amount}&address=${address}`,
          });

          console.log("getSellDestinationAccount received:", result);

          const {
            recipientAddress,
            amount: finalAmount,
            binaryPayload,
            signature,
          } = result.data;

          return {
            recipientAddress,
            amount: BigNumber(finalAmount),
            binaryPayload: Buffer.from(binaryPayload),
            signature: Buffer.from(signature),
          };
        },
      })
      .catch((err) => {
        console.error(
          "%cExchangeSDK error:",
          "background: #7f0000; color: #fff",
          err,
        );
      });
  }, [fromAccount, amount, feeSelected, customFeeConfig, quoteId]);

  return (
    <Layout title="Sell Web App Example">
      <h1>Hello I am a Sell Web app</h1>

      <div>
        <button onClick={listAccounts}>{"List accounts"}</button>
      </div>
      <div style={{ backgroundColor: "#999999" }}>
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
            value="slow"
            defaultChecked={feeSelected === "slow"}
          />{" "}
          slow
          <input
            type="radio"
            name="fee"
            value="medium"
            defaultChecked={feeSelected === "medium"}
          />{" "}
          medium
          <input
            type="radio"
            name="fee"
            value="fast"
            defaultChecked={feeSelected === "fast"}
          />{" "}
          fast
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
      </div>

      <div>
        <button onClick={() => onSell()}>{"Execute sell"}</button>
      </div>

      <div>
        <input name="currency" ref={currencyInputRef} />
        <button onClick={onUninstallCoin}>{"Ask for currency account"}</button>
      </div>
      <div>
        <button onClick={getInitFeeCurrency}>
          {"Ask for init fee currency"}
        </button>
      </div>
    </Layout>
  );
};

export default IndexPage;
