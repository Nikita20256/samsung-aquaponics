import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Platform } from 'react-native';

export default function useLoadingProgress(durationMs: number, reverse = false) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    let mounted = true;
    let preferenceChanged = false;
    const motionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        preferenceChanged = true;
        setReduceMotion(enabled);
      },
    );
    const appSubscription = AppState.addEventListener('change', (state) => {
      setIsActive(state === 'active');
    });

    AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (mounted && !preferenceChanged) setReduceMotion(enabled);
      },
      () => {
        // Keep the indicator still if the system preference cannot be read.
      },
    );

    return () => {
      mounted = false;
      motionSubscription.remove();
      appSubscription.remove();
    };
  }, []);

  useEffect(() => {
    progress.setValue(0);
    if (reduceMotion || !isActive) return;

    const timing = (toValue: number) =>
      Animated.timing(progress, {
        toValue,
        duration: Math.max(1, reverse ? durationMs / 2 : durationMs),
        easing: reverse ? Easing.inOut(Easing.sin) : Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
        isInteraction: false,
      });
    const animation = Animated.loop(
      reverse ? Animated.sequence([timing(1), timing(0)]) : timing(1),
    );
    animation.start();
    return () => animation.stop();
  }, [durationMs, isActive, progress, reduceMotion, reverse]);

  return progress;
}
