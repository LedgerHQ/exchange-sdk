"use client";

import { Stack, Title } from "@mantine/core";

import { useExchangeSdk } from "@/hooks/useExchangeSdk";
import { DashboardCard } from "./DashboardCard";

export function SellForm() {
  const { execute } = useExchangeSdk();

  return (
    <DashboardCard title="Sell" description="Sell functionality coming soon" />
  );
}
