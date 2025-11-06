"use client";

import { useExchangeSdk } from "@/hooks/useExchangeSdk";
import { DashboardCard } from "./DashboardCard";

export function TokenApprovalForm() {
  const { execute } = useExchangeSdk();

  return (
    <DashboardCard
      title="Token Approval"
      description="Token approval functionality coming soon"
    />
  );
}
