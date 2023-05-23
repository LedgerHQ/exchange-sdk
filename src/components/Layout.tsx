import React, { ReactNode } from "react";
import { Flex } from "@ledgerhq/react-ui";
import Head from "next/head";

export const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <Flex flexDirection="column" height="100vh">
      <Head>
        <title>Swap Web App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {children}
    </Flex>
  );
};
