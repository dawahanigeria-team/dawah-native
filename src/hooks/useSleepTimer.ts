import { useEffect, useState } from "react";
import { useEntity } from "simpler-state";
import { ActionSheetIOS, Alert, Platform } from "react-native";

import { playerStore, usePlayerActions } from "../stores/playerStore";

// Short options first: the common case is "I am already falling asleep",
// not planning an hour ahead.
const SLEEP_TIMER_MINUTES = [5, 15, 30, 45, 60];
const COUNTDOWN_TICK_MS = 15_000;

export interface SleepTimerControl {
  isArmed: boolean;
  endOfTrack: boolean;
  /** Rounded up, so it never reads "0 min" while the timer is still counting. */
  minutesRemaining: number | null;
  /** Cancels an armed timer, otherwise offers the durations. */
  press: () => void;
}

export const useSleepTimer = (): SleepTimerControl => {
  const endsAt = useEntity(playerStore, (s) => s.sleepTimerEndsAt);
  const endOfTrack = useEntity(playerStore, (s) => s.sleepTimerEndOfTrack);
  const { setSleepTimer, setSleepTimerEndOfTrack, clearSleepTimer } = usePlayerActions();

  // Reading the clock in render would be cached by React Compiler, so the
  // countdown keeps its own ticking time while a timer is set.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS);
    return () => clearInterval(interval);
  }, [endsAt]);

  const isArmed = Boolean(endsAt) || endOfTrack;
  const minutesRemaining = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 60_000)) : null;

  const press = () => {
    if (isArmed) {
      clearSleepTimer();
      return;
    }

    const labels = [...SLEEP_TIMER_MINUTES.map((m) => `${m} minutes`), "End of this lecture"];
    const apply = (index: number) => {
      if (index < SLEEP_TIMER_MINUTES.length) setSleepTimer(SLEEP_TIMER_MINUTES[index]);
      else setSleepTimerEndOfTrack();
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: "Sleep timer", options: [...labels, "Cancel"], cancelButtonIndex: labels.length },
        (index) => {
          if (index < labels.length) apply(index);
        },
      );
      return;
    }

    // Android Alert caps out at three buttons on older versions.
    Alert.alert("Sleep timer", "Stop playback after…", [
      { text: "15 min", onPress: () => setSleepTimer(15) },
      { text: "30 min", onPress: () => setSleepTimer(30) },
      { text: "End of lecture", onPress: setSleepTimerEndOfTrack },
    ]);
  };

  return { isArmed, endOfTrack, minutesRemaining, press };
};
