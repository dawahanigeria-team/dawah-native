import AsyncStorage from "expo-sqlite/kv-store";
import * as React from "react";

export function useStorageState(key: string): [boolean, string | null, (value: string | null) => void] {
  const [isLoading, setIsLoading] = React.useState(true);
  const [state, setState] = React.useState<string | null>(null);

  React.useEffect(() => {
    AsyncStorage.getItem(key)
      .then((value) => {
        setState(value);
        setIsLoading(false);
      })
      .catch(() => {
        setState(null);
        setIsLoading(false);
      });
  }, [key]);

  const setValue = React.useCallback(
    (value: string | null) => {
      setState(value);
      if (value === null) {
        AsyncStorage.removeItem(key);
      } else {
        AsyncStorage.setItem(key, value);
      }
    },
    [key]
  );

  return [isLoading, state, setValue];
}
