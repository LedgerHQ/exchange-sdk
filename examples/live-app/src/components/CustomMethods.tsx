"use client";

import { Button, Group, Stack, Title } from "@mantine/core";

import { useExchangeSdk } from "@/hooks/useExchangeSdk";

export function CustomMethods() {
  const { execute } = useExchangeSdk();

  async function handleCloseApp() {
    try {
      await execute("closeLiveApp");
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <Stack>
      <Title order={3}>Custom Methods</Title>

      <Group mt="md">
        <Button onClick={handleCloseApp}>Close App</Button>
      </Group>
    </Stack>
  );
}
