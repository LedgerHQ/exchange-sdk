"use client";

import { useGetAccounts } from "@/hooks/useGetAccounts";
import { useState } from "react";

export function ListAccounts({
  onAccountClick,
}: {
  onAccountClick: (accountId: string) => void;
}) {
  const getAccounts = useGetAccounts();
  const [accounts, setAccounts] = useState<any[]>([]);

  const handleListAccounts = function () {
    getAccounts().then(setAccounts);
  };

  return (
    <section>
      <div>
        <button onClick={handleListAccounts}>{"List accounts"}</button>
      </div>
      <div style={{ backgroundColor: "#999999" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => {
              return (
                <tr key={account.id} onClick={() => onAccountClick(account.id)}>
                  <td>{account.name}</td>
                  <td>{account.id}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
