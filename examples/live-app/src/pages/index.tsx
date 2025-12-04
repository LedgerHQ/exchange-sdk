"use client";

import Head from "next/head";
import { ExchangeProvider } from "@/providers/ExchangeProvider";
import { FundForm } from "@/components/FundForm";
import { AppShell, Grid, Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { RequestAndSignForAccount } from "@/components/RequestAndSignForAccountForm";
import { SwapForm } from "@/components/SwapForm";
import { SellForm } from "@/components/SellForm";
import { TokenApprovalForm } from "@/components/TokenApprovalForm";
import { CloseApp } from "@/components/CloseApp";
import { TrackEvent } from "@/components/TrackEvent";
import { TrackPage } from "@/components/TrackPage";

export default function Home() {
  return (
    <>
      <Head>
        <title>Fund - Test App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AppShell
        padding="md"
        header={{ height: 60 }}
        aside={{ width: { sm: 200, lg: 300 }, breakpoint: "sm" }}
      >
        <ExchangeProvider>
          <AppShell.Header p="md">
            <Title order={3}>Exchange SDK Test Suite</Title>
          </AppShell.Header>
          <AppShell.Main>
            <Stack>
              <Title order={4}>Flows</Title>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                <FundForm />
                <RequestAndSignForAccount />
                <TokenApprovalForm />
                <SwapForm />
                <SellForm />
              </SimpleGrid>
            </Stack>
            <Stack mt="xl">
              <Title order={4}>Utilities</Title>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                <CloseApp />
                <TrackEvent />
                <TrackPage />
              </SimpleGrid>
            </Stack>
          </AppShell.Main>
        </ExchangeProvider>
      </AppShell>
    </>
  );
}
