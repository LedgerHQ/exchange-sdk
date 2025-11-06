"use client";

import { Stack, Title } from "@mantine/core";

import { useExchangeSdk } from "@/hooks/useExchangeSdk";
import { DashboardCard } from "./DashboardCard";

export function SwapForm() {
  const { execute } = useExchangeSdk();

  return (
    <DashboardCard title="Swap" description="Swap functionality coming soon" />
  );
}
