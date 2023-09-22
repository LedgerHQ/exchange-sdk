"use client";

import { useCallback, useEffect, useState } from "react";
import { debounce } from "debounce";
import {
  HashSchema,
  HashSchemaType,
  HashStateSchema,
  HashStateSchemaType,
} from "../schemas/HashSchema";

const debouncedSetHashInURL = debounce(
  (hashState: Readonly<HashStateSchemaType>) => {
    // don't want to include key since this is calculated
    // from the location.hash
    const hashSchema = Object.entries(hashState).reduce(
      (prev, [key, value]) => {
        if (key == "key") {
          return prev;
        }
        return {
          ...prev,
          [key]: value,
        };
      },
      {} as HashSchemaType
    );
    const hash = new URLSearchParams({
      state: JSON.stringify(hashSchema),
    });
    location.hash = hash.toString();
  },
  1000
);

export function useHashState(): [
  HashSchemaType | undefined,
  (_: Partial<HashSchemaType>) => void
] {
  const [hashState, setHashState] = useState<HashStateSchemaType | undefined>(
    undefined
  );

  const hashChangeHandler = useCallback(() => {
    const hash = new URLSearchParams(window.location.hash.substring(1));
    const state = JSON.parse(hash.get("state") ?? "{}");
    const safeState = HashSchema.safeParse(state);
    if (safeState.success) {
      // Only update the schema if the parsed state is matches the schema.
      setHashState({ ...safeState.data, key: window.location.hash });
    } else {
      console.log(
        "%cuseHashState.ts line:51 safeState.error",
        "color: #007acc;",
        safeState.error
      );
    }
  }, []);

  const updateHashState = useCallback(
    (partialNewState: Partial<HashSchemaType>) => {
      if (hashState) {
        setHashState((prev) => {
          const safeNewState = HashStateSchema.safeParse({
            ...prev,
            ...partialNewState,
          });

          if (!safeNewState.success) {
            return prev;
          }
          debouncedSetHashInURL(safeNewState.data);
          return safeNewState.data;
        });
      }
    },
    [hashState?.key]
  );

  useEffect(() => {
    hashChangeHandler();
  }, [hashChangeHandler]);

  useEffect(() => {
    window.addEventListener("hashchange", hashChangeHandler);
    return () => window.removeEventListener("hashchange", hashChangeHandler);
  }, [hashChangeHandler]);

  return [hashState, updateHashState];
}
