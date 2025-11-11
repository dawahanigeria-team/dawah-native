import AsyncStorage from "@react-native-async-storage/async-storage";
import { playerStore } from "./playerStore";
import { PlayerState } from "../types/types";

const PLAYER_STATE_KEY = "PLAYER_STATE";

export const setAndPersistPlayerState = (newState: Partial<PlayerState>) => {
  const currentState = playerStore.get();
  const updatedState = { ...currentState, ...newState };
  playerStore.set(updatedState);
  // Avoid storing the entire queue, as it can be large
  const persistableState = { ...updatedState, queue: [] };
  AsyncStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(persistableState));
};
