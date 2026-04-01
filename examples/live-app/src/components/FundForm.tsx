"use client";

import { Button, Group, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";

import BigNumber from "bignumber.js";
import { useExchangeSDK } from "@/providers/ExchangeProvider";
import { useRequestAccounts } from "@/hooks/useRequestAccounts";
import { DashboardCard } from "./DashboardCard";

/**
 * ExchangeSDK.fund expects `fromAmount` in whole coin units (e.g. ETH), not wei.
 * It converts with amount × 10^decimals before comparing to `account.spendableBalance`
 * (which is always in the smallest unit, e.g. wei).
 */
export function FundForm() {
  const sdk = useExchangeSDK();
  const requestAccounts = useRequestAccounts();

  async function handleFund({ amount }: { amount: number }) {
    if (!sdk) return;

    try {
      const account = await requestAccounts();

      if (!account || Array.isArray(account)) {
        console.log("[FundForm] no account selected");
        return;
      }

      const [currency] = await sdk.walletAPI.currency.list({
        currencyIds: [account.currency],
      });

      if (!currency) {
        throw new Error("Could not load currency for this account");
      }

      const decimals = currency.decimals;
      const fromAmount = new BigNumber(amount);
      const amountAtomic = fromAmount.shiftedBy(decimals);

      if (!amountAtomic.isInteger()) {
        throw new Error(
          `Amount must have at most ${decimals} decimal places for ${currency.ticker ?? account.currency}`,
        );
      }

      if (account.spendableBalance.isLessThan(amountAtomic)) {
        const maxHuman = account.spendableBalance.shiftedBy(-decimals);
        throw new Error(
          `Not enough funds: you entered ${fromAmount.toFixed()} ${currency.ticker ?? account.currency} but only ~${maxHuman.toFixed(6)} is spendable (balances are in smallest units; the SDK compares wei to wei).`,
        );
      }

      await sdk.fund({
        fromAccountId: account.id,
        fromAmount,
      });
    } catch (err) {
      console.error(err);
      throw err;
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
        <Text size="sm" c="dimmed" mb="xs">
          Amount is in whole coins (e.g. 0.01 ETH), not wei. It must not exceed
          spendable balance.
        </Text>
        <TextInput
          label="Amount"
          placeholder="e.g. 0.01"
          key={form.key("amount")}
          {...form.getInputProps("amount")}
          type="number"
          step="any"
          min={0}
        />

        <Group mt="md">
          <Button type="submit">Execute Fund</Button>
        </Group>
      </form>
    </DashboardCard>
  );
}
