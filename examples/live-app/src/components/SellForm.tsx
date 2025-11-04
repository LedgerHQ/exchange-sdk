"use client";

import { Stack, Title } from "@mantine/core";

import { useExchangeSdk } from "@/hooks/useExchangeSdk";

export function SellForm() {
  const { execute } = useExchangeSdk();

  return (
    <Stack>
      <Title order={4}>TODO: Sell</Title>
    </Stack>
  );
}
