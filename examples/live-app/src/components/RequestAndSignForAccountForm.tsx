"use client";

import { Button, Group, Stack, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";

import { Account } from "@ledgerhq/wallet-api-client";
import { useExchangeSdk } from "@/hooks/useExchangeSdk";

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
    <Stack>
      <Title order={4}>Request and Sign for Account</Title>
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
    </Stack>
  );
}
