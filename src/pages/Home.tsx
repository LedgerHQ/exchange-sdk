import {
  Button,
  Flex,
  NumberInput,
  Radio,
  SelectInput,
  Text,
  ButtonExpand,
} from "@ledgerhq/react-ui";

import { useCallback, useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import { useSearchParams } from "next/navigation";
import { ExchangeSDK, FeeStrategy } from "../exchangeSDK";

import { Account } from "@ledgerhq/wallet-api-client";

const defaultFee = "SLOW";

const HomePage = () => {
  const searchParams = useSearchParams();

  const exchangeSDK = useRef<ExchangeSDK>();

  const [allAccounts, setAllAccounts] = useState<Array<Account>>([]);
  const [amount, setAmount] = useState(0);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [feeSelected, setFeeSelected] = useState(defaultFee);
  const [isPopinOpen, setIsPopinOpen] = useState(false);

  useEffect(() => {
    const providerId = "changelly";
    exchangeSDK.current = new ExchangeSDK(providerId);

    // Cleanup the Ledger Live API on component unmount
    return () => {
      exchangeSDK.current.disconnect();
      exchangeSDK.current = undefined;
    };
  }, []);

  const getListAccounts = useCallback(async () => {
    console.log("Search for all accounts");
    const result = await exchangeSDK.current?.walletAPI.account.list();

    if (result) {
      setAllAccounts(result);
    }
  }, [exchangeSDK]);

  const toogleAccountList = useCallback(async () => {
    debugger;
    setIsPopinOpen(!isPopinOpen);
  }, []);

  const handleAmount = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(event);
  };
  const handleFromAccount = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFromAccount(event.value);
    }
  );

  const handleToAccount = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setToAccount(event.value);
    }
  );
  const handleFee = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFeeSelected(event);
    }
  );
  const onSwap = useCallback(() => {
    exchangeSDK.current
      .swap({
        quoteId: "84F84F76-FD3A-461A-AF6B-D03F78F7123B",
        fromAccountId: fromAccount,
        toAccountId: toAccount,
        fromAmount: BigInt(amount),
        feeStrategy: feeSelected,
      })
      .catch((err) => {
        console.error(err);
        alert(err);
      });
  }, [amount, fromAccount, toAccount, feeSelected]);

  const onLLSwap = useCallback(() => {
    const toAccountId = searchParams.get("toAccountId");
    const fromAccountId = searchParams.get("fromAccountId");
    const fromAmount = searchParams.get("fromAmount");
    const feeStrategy = searchParams.get("feeStrategy");
    const quoteId = decodeURIComponent(searchParams.get("quoteId"));

    const provider = searchParams.get("provider");

    const params = {
      quoteId: "1234", //pending to test
      fromAccountId,
      toAccountId,
      fromAmount,
      feeStrategy, // What happend if the fees are personalise (CUSTOM mode)
    };
    debugger;
    exchangeSDK.current.swap(params);
  }, [searchParams]);
  const options = allAccounts.map((item) => {
    return {
      label: item?.name,
      value: item?.id,
    };
  });
  return (
    <Flex flexDirection="column" m="1rem">
      <Text variant="h1" textTransform="uppercase">
        Swap Web app
      </Text>

      <Button variant="main" outline={false} onClick={getListAccounts}>
        Retrieve all accounts
      </Button>

      {/* <ButtonExpand onToggle={toogleAccountList}>See Account List</ButtonExpand> */}

      {/* <div display={isPopinOpen} style={{ backgroundColor: "#999999" }}>
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
      </div> */}

      <Flex mb="1rem" rowGap="1rem" flexDirection="column">
        <Text variant="h4" textTransform="uppercase">
          Amount
        </Text>
        <NumberInput
          max={349}
          min={0}
          onChange={handleAmount}
          onPercentClick={function noRefCheck() {}}
          placeholder="Placeholder"
          value={amount}
        />
      </Flex>
      <Flex mb="1rem" rowGap="1rem" flexDirection="column">
        <Text variant="h4" textTransform="uppercase">
          Fee
        </Text>
        <Radio currentValue={feeSelected} onChange={handleFee}>
          {["SLOW", "MEDIUM", "FAST"].map((item, i) => {
            return (
              <Radio.ListElement
                containerProps={{
                  flex: 1,
                }}
                label={item}
                value={item}
              />
            );
          })}
        </Radio>
      </Flex>

      <Flex mb="1rem">
        <Flex flex="1" mr="1rem" rowGap="1rem" flexDirection="column">
          <Text variant="h4" textTransform="uppercase">
            From Account
          </Text>
          <SelectInput onChange={handleFromAccount} options={options} />
        </Flex>

        <Flex flex="1" ml="1rem" rowGap="1rem" flexDirection="column">
          <Text variant="h4" textTransform="uppercase">
            To Account
          </Text>
          <SelectInput onChange={handleToAccount} options={options} />
        </Flex>
      </Flex>

      <Flex mb="1rem">
        <Flex flex="1" mr="1rem" rowGap="1rem" flexDirection="column">
          <Button
            disabled={
              !(amount && fromAccount.length && toAccount.length && feeSelected)
            }
            variant="color"
            outline={false}
            onClick={onSwap}
          >
            Execute Swap
          </Button>
        </Flex>

        <Flex flex="1" ml="1rem" rowGap="1rem" flexDirection="column">
          <Button variant="color" outline={false} onClick={onLLSwap}>
            Execute swap from LL
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default HomePage;
