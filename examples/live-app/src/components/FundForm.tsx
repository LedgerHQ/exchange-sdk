"use client";

import { Button, Group, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";

import BigNumber from "bignumber.js";
import { useExchangeSDK } from "@/providers/ExchangeProvider";
import { useRequestAccounts } from "@/hooks/useRequestAccounts";
import { DashboardCard } from "./DashboardCard";

export function FundForm() {
  const sdk = useExchangeSDK();
  const requestAccounts = useRequestAccounts();

  async function handleFund({ amount }: { amount: number }) {
    try {
      const account = await requestAccounts();

      if (!account) {
        console.log("[FundForm] no account selected");
      }

      sdk?.fund({
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
    <DashboardCard
      title="Fund"
      description="Fund an account with a specified amount"
    >
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
    </DashboardCard>
  );
}
