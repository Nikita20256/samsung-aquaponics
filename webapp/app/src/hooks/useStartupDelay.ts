import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { STARTUP_DURATION_MS } from '../config/startup';

/** Keeps the launch delay accurate when the phone suspends JavaScript. */
export default function useStartupDelay(durationMs = STARTUP_DURATION_MS) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const deadline = Date.now() + durationMs;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      clearTimeout(timer);
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        setReady(true);
      } else {
        timer = setTimeout(schedule, remaining);
      }
    };

    setReady(false);
    schedule();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule();
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [durationMs]);

  return ready;
}
