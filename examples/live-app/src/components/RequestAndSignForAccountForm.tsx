"use client";

import { Button, Group, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";

import { useExchangeSdk } from "@/hooks/useExchangeSdk";
import { DashboardCard } from "./DashboardCard";

export function RequestAndSignForAccount() {
  const { execute } = useExchangeSdk();

  async function handleSign({ message }: { message: string }) {
    try {
      await execute("requestAndSignForAccount", {
        message: Buffer.from(message),
        currencyIds: ["ethereum", "ethereum/erc20/usd__coin"],
      });
    } catch (err) {
      console.error(err);
    }
  }

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      message: "",
    },
  });

  return (
    <DashboardCard
      title="Request and Sign for Account"
      description="Request an account and sign a message with it"
    >
      <form onSubmit={form.onSubmit(handleSign)}>
        <TextInput
          label="Message"
          placeholder="Message to sign"
          key={form.key("message")}
          {...form.getInputProps("message")}
        />

        <Group mt="md">
          <Button type="submit">Execute Sign</Button>
        </Group>
      </form>
    </DashboardCard>
  );
}
