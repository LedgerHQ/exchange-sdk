"use client";

import { Button, Group } from "@mantine/core";

import { useExchangeSdk } from "@/hooks/useExchangeSdk";
import { DashboardCard } from "./DashboardCard";

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
    <DashboardCard
      title="Close App"
      description="When within the LL Wallet this action will call a custom close method"
    >
      <Group justify="flex-end" mt="md">
        <Button onClick={handleCloseApp}>Close App</Button>
      </Group>
    </DashboardCard>
  );
}
