"use client";

import { useFund } from "@/hooks/useFund";
import BigNumber from "bignumber.js";
import { useState } from "react";

export function FundForm({ fromAccountId }: { fromAccountId: string }) {
  const executeFund = useFund();
  const [fromAmount, setFromAmount] = useState("");

  function handleFund() {
    if (!fromAccountId) {
      console.error("Oh oh");
      return;
    }

    executeFund({
      fromAccountId,
      fromAmount: new BigNumber(fromAmount),
    });
  }

  function handleFromAmountChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFromAmount(event.target.value);
  }

  return (
    <section>
      <div>
        <label htmlFor="fromAccount" style={{ color: "#dddddd" }}>
          {"From Account"}
        </label>
        <input name="fromAccount" disabled value={fromAccountId} />
      </div>
      <div>
        <label htmlFor="fromAmount" style={{ color: "#dddddd" }}>
          {"Amount"}
        </label>
        <input
          name="fromAmount"
          onChange={handleFromAmountChange}
          value={fromAmount}
        />
      </div>
      <button onClick={handleFund}>Execute Fund</button>
    </section>
  );
}
