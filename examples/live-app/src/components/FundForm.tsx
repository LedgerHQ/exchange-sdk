"use client";

import { Button, Group, Stack, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";

import BigNumber from "bignumber.js";
import { Account } from "@ledgerhq/wallet-api-client";
import { useExchangeSdk } from "@/hooks/useExchangeSdk";

type FundFormProps = {
  account: Account | undefined;
};

export function FundForm({ account }: FundFormProps) {
  const { execute } = useExchangeSdk();

  async function handleFund({ amount }: { amount: number }) {
    try {
      await execute("fund", {
        fromAccountId: account?.id ?? "",
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
          <Button type="submit" disabled={!account}>
            Execute Fund
          </Button>
        </Group>
      </form>
    </Stack>
  );
}
