"use client";

import { Stack, Title } from "@mantine/core";

import { useExchangeSdk } from "@/hooks/useExchangeSdk";

export function SwapForm() {
  const { execute } = useExchangeSdk();

  return (
    <Stack>
      <Title order={4}>TODO: Swap</Title>
    </Stack>
  );
}
