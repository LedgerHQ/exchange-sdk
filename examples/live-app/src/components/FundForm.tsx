"use client";

import { Button, Group, Stack, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";

import BigNumber from "bignumber.js";
import { Account } from "@ledgerhq/wallet-api-client";
import { useExchangeSdk } from "@/hooks/useExchangeSdk";
import { useRequestAccounts } from "@/hooks/useRequestAccounts";

export function FundForm() {
  const { execute } = useExchangeSdk();
  const requestAccounts = useRequestAccounts();

  async function handleFund({ amount }: { amount: number }) {
    try {
      const account = await requestAccounts();

      if (!account) {
        console.log("[FundForm] no account selected");
      }

      await execute("fund", {
        // @ts-ignore
        fromAccountId: account.id ?? "",
        fromAmount: new BigNumber(amount),
      });
    } catch (err) {
      console.error(err);
    }
  }

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      amount: 0,
    },
  });

  return (
    <Stack>
      <Title order={3}>Fund</Title>
      <form onSubmit={form.onSubmit(handleFund)}>
        <TextInput
          label="Amount"
          placeholder="Amount to fund"
          key={form.key("amount")}
          {...form.getInputProps("amount")}
        />

        <Group mt="md">
          <Button type="submit">Execute Fund</Button>
        </Group>
      </form>
    </Stack>
  );
}
