"use client";

import { Card, Text } from "@mantine/core";

export function DashboardCard({
  children,
  title,
  description,
}: {
  children?: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card withBorder radius="md" p="xl">
      <Text fz="lg" fw={500}>
        {title}
      </Text>
      <Text fz="xs" c="dimmed" mt={3} mb="md">
        {description}
      </Text>
      {children}
    </Card>
  );
}
