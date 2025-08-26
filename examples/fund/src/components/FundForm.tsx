"use client";

import { useFund } from "@/hooks/useFund";
import BigNumber from "bignumber.js";

export function FundForm({ fromAccountId }: { fromAccountId: string }) {
  const executeFund = useFund();

  function handleFund() {
    if (!fromAccountId) {
      console.error("Oh oh");
      return;
    }

    executeFund({
      orderId: "1234",
      fromAccountId,
      amount: new BigNumber(0.1),
    });
  }

  return (
    <section>
      <div>
        <label htmlFor="fromAccount" style={{ color: "#dddddd" }}>
          {"From Account"}
        </label>
        <input name="fromAccount" disabled value={fromAccountId} />
      </div>
      <button onClick={handleFund}>Execute Fund</button>
    </section>
  );
}
