"use client";

import { useOpenNativeAccountSelect } from "@/hooks/useOpenNativeAccountSelect";
import { Box, Title, Button, MultiSelect, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { Account, Currency } from "@ledgerhq/wallet-api-client";
import { useGetCurrencies } from "@/hooks/useGetCurrencies";
import { AccountDetails } from "./AccountDetails";
import { supportedCurrencies } from "@/config/currencies";

type AssetToolbarProps = {
  account: Account | undefined;
  setAccount: (account: Account | undefined) => void;
};

export function AssetToolbar({ account, setAccount }: AssetToolbarProps) {
  const openNativeAccountSelect = useOpenNativeAccountSelect();
  const getSelectedCurrencyIds = useGetCurrencies();
  const [selectedCurrencyIds, setSelectedCurrencyIds] = useState<string[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<Currency[]>([]);

  const handleAccountSelectClick = function () {
    openNativeAccountSelect(selectedCurrencyIds).then(setAccount);
  };

  useEffect(() => {
    getSelectedCurrencyIds(selectedCurrencyIds).then(setSelectedCurrencies);
  }, [selectedCurrencyIds]);

  return (
    <section>
      <Stack>
        <Title order={3}>Assets</Title>
        <MultiSelect
          label="Select currency"
          placeholder=""
          limit={5}
          data={supportedCurrencies}
          searchable
          onChange={setSelectedCurrencyIds}
        />
        <AccountDetails
          account={account}
          selectedCurrencies={selectedCurrencies}
        />
        <Button
          onClick={handleAccountSelectClick}
          variant="light"
          size="xs"
          style={{ marginLeft: "auto" }}
        >
          + Select Account
        </Button>
      </Stack>
    </section>
  );
}
