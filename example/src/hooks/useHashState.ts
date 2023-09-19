"use client";

import { useCallback, useEffect, useState } from "react";
import z from "zod";

const stateSchema = z.object({
  enabled: z.boolean(),
});
type State = z.infer<typeof stateSchema>;

export function useHashState() {
  const [hashState, setHashState] = useState<State | undefined>(undefined);

  const hashChangeHandler = useCallback(() => {
    const hash = new URLSearchParams(window.location.hash.substring(1));
    const state = JSON.parse(hash.get("state") ?? "{}");

    const safeState = stateSchema.safeParse(state);
    if (safeState.success) {
      // Only update the schema if the parsed state is matches the schema.
      setHashState(safeState.data);
    } else {
      console.log(
        "%cerror useHashState.ts line:22 ",
        "color: red; display: block; width: 100%;",
        safeState.error
      );
    }
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", hashChangeHandler);
    return () => window.removeEventListener("hashchange", hashChangeHandler);
  }, [hashChangeHandler]);

  return hashState;
}
