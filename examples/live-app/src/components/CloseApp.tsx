"use client";

import { Button, Card, Group, Text } from "@mantine/core";

import { useExchangeSdk } from "@/hooks/useExchangeSdk";

export function CloseApp() {
  const { execute } = useExchangeSdk();

  async function handleCloseApp() {
    try {
      await execute("closeLiveApp");
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <Card withBorder radius="md" p="xl">
      <Text fz="lg" fw={500}>
        Close App
      </Text>
      <Text fz="xs" c="dimmed" mt={3} mb="md">
        When within the LL Wallet this action will call a custom close method
      </Text>
      <Group justify="flex-end" mt="md">
        <Button onClick={handleCloseApp}>Close App</Button>
      </Group>
    </Card>
  );
}
