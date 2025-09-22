"use client";

import Head from "next/head";
import { ExchangeProvider } from "@/providers/ExchangeProvider";
import { useState } from "react";
import { FundForm } from "@/components/FundForm";
import { AssetToolbar } from "@/components/AssetToolbar";
import { AppShell, Stack, Title } from "@mantine/core";
import { Account } from "@ledgerhq/wallet-api-client";
import { NoahForm } from "@/components/NoahForm";

export default function Home() {
  const [account, setAccount] = useState<Account | undefined>(undefined);

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
            <Title order={2}>Test Live App</Title>
          </AppShell.Header>
          <AppShell.Aside p="xs">
            <AssetToolbar account={account} setAccount={setAccount} />
          </AppShell.Aside>
          <AppShell.Main>
            <Stack>
              <FundForm account={account} />
              <NoahForm account={account} />
            </Stack>
          </AppShell.Main>
        </ExchangeProvider>
      </AppShell>
    </>
  );
}
