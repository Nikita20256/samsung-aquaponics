import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

const UPDATE_INTERVAL_MS = 4000;
const TRANSITION_MS = 1600;
const FRAME_INTERVAL_MS = 1000 / 30;
type ReadingOptions = { initial: number; minimum: number; maximum: number; decimals?: number };

export default function useSimulatedReading({ initial, minimum, maximum, decimals = 0 }: ReadingOptions) {
  const randomValue = () => {
    const factor = 10 ** decimals;
    return (Math.round(minimum * factor) + Math.floor(Math.random() * (Math.round((maximum - minimum) * factor) + 1))) / factor;
  };

  const [sample, setSample] = useState({ value: initial, time: 0, lowest: initial, highest: initial });
  const current = useRef(sample);
  const [active, setActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let mounted = true;
    let preferenceChanged = false;
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => {
      preferenceChanged = true;
      setReduceMotion(enabled);
    });
    const app = AppState.addEventListener('change', state => setActive(state === 'active'));
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted && !preferenceChanged) setReduceMotion(enabled);
    }, () => {});
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);

  useEffect(() => {
    if (!active) return;

    // Keep readings live even when the user has disabled decorative motion.
    if (reduceMotion) {
      const timer = setInterval(() => {
        const value = randomValue();
        current.current = {
          value, time: 0,
          lowest: Math.min(current.current.lowest, value),
          highest: Math.max(current.current.highest, value),
        };
        setSample(current.current);
      }, UPDATE_INTERVAL_MS);
      return () => clearInterval(timer);
    }

    let frame = 0;
    let lastFrame: number | undefined;
    let nextUpdate: number | undefined;
    let transitionStart = 0;
    let from = current.current.value;
    let target = from;

    const animate = (now: number) => {
      if (lastFrame === undefined) lastFrame = now;
      if (nextUpdate === undefined) nextUpdate = now + UPDATE_INTERVAL_MS;
      const elapsed = now - lastFrame;
      if (elapsed >= FRAME_INTERVAL_MS) {
        if (now >= nextUpdate) {
          from = current.current.value;
          target = randomValue();
          transitionStart = now;
          nextUpdate = now + UPDATE_INTERVAL_MS;
        }
        const progress = Math.min(1, (now - transitionStart) / TRANSITION_MS);
        const eased = progress * progress * (3 - 2 * progress);
        const value = from + (target - from) * eased;
        current.current = {
          value,
          lowest: Math.min(current.current.lowest, value),
          highest: Math.max(current.current.highest, value),
          time: current.current.time + elapsed / 1000,
        };
        setSample(current.current);
        lastFrame = now;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active, reduceMotion, minimum, maximum, decimals]);

  return { ...sample, moving: !reduceMotion };
}
