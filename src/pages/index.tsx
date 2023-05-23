import { GetStaticProps } from "next";
import React from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { Layout } from "@/components/Layout";
import { NextPageWithLayout } from "@/types/nextjs";
import HomePage from "@/pages/Home";

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(locale ? await serverSideTranslations(locale, ["common"]) : null),
  },
});

const RootPage: NextPageWithLayout = () => <HomePage />;

export default RootPage;
