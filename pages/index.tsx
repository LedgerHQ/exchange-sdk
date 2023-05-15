import Link from "next/link";
import { useCallback } from "react";
import Layout from "../components/Layout";
import { useSearchParams } from "next/navigation";

const IndexPage = (props) => {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider");
  const onSwap = useCallback(() => {
    console.log("provider", provider);
  }, [provider]);

  return (
    <Layout title="Swao Web App Example">
      <h1>Hello I am a Swap Web app</h1>
      <button onClick={() => onSwap()}>{"Execute swap"}</button>
    </Layout>
  );
};

export default IndexPage;
