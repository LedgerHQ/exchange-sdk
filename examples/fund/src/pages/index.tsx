"use client";

import Head from "next/head";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { ExchangeProvider } from "@/providers/ExchangeProvider";
import { ListAccounts } from "@/components/ListAccounts";
import { useState } from "react";
import { FundForm } from "@/components/FundForm";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const [fromAccountId, setFromAccount] = useState<string | null>(null);

  return (
    <>
      <Head>
        <title>Fund - Test App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div
        className={`${styles.page} ${geistSans.variable} ${geistMono.variable}`}
      >
        <main className={styles.main}>
          <h1>Fund Test App</h1>
          <ExchangeProvider>
            {fromAccountId && <FundForm fromAccountId={fromAccountId} />}
            <ListAccounts
              onAccountClick={(accountId: string) => setFromAccount(accountId)}
            />
          </ExchangeProvider>
        </main>
      </div>
    </>
  );
}
