"use client";

import { Button, Group } from "@mantine/core";

import { useExchangeSDK } from "@/providers/ExchangeProvider";
import { DashboardCard } from "./DashboardCard";

export function CloseApp() {
  const sdk = useExchangeSDK();

  async function handleCloseApp() {
    try {
      await sdk?.closeLiveApp();
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
