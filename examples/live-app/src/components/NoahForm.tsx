"use client";

import { Button, Group, Stack, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";

import { Account } from "@ledgerhq/wallet-api-client";
import { useExchangeSdk } from "@/hooks/useExchangeSdk";

type NoahFormProps = {
  account: Account | undefined;
};

export function NoahForm({ account }: NoahFormProps) {
  const { execute } = useExchangeSdk();

  async function handleSign({ message }: { message: string }) {
    try {
      const result = await execute("requestAndSignForAccount", {
        accountId: account?.id ?? "",
        message: Buffer.from(message),
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
      <Title order={3}>Noah</Title>
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
