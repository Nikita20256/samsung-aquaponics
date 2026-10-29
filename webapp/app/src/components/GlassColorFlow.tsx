import { memo, useId } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import useLoadingProgress from '../hooks/useLoadingProgress';
import { glass } from '../theme/glass';

const palette = ['#78D38B', '#53BFB8', '#D2D986'];
const steps = Array.from({ length: 33 }, (_, i) => i / 32);

export default memo(function GlassColorFlow({ width, height }: { width: number; height: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const seed = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const progress = useLoadingProgress(glass.flowDurationMs + seed % 5 * 700);
  const diameter = Math.max(width * 0.8, height * 1.25, 120);
  const phase = seed % 20 / 20 * Math.PI * 2;

  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]} pointerEvents="none" accessible={false}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {palette.map((color, i) => {
        const angle = phase + i * Math.PI * 2 / palette.length;
        const direction = i === 1 ? -1 : 1;
        const gradientId = `${id}flow${i}`;
        return (
          <Animated.View key={color} pointerEvents="none" style={{
            position: 'absolute', width: diameter, height: diameter,
            left: (width - diameter) / 2, top: (height - diameter) / 2,
            transform: [
              { translateX: progress.interpolate({
                inputRange: steps,
                outputRange: steps.map(t => Math.cos(t * Math.PI * 2 * direction + angle) * width * 0.46),
              }) },
              { translateY: progress.interpolate({
                inputRange: steps,
                outputRange: steps.map(t => Math.sin(t * Math.PI * 2 * direction + angle) * height * 0.46),
              }) },
            ],
          }}>
            <Svg width={diameter} height={diameter} viewBox="0 0 100 100">
              <Defs>
                <RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset={0} stopColor={color} stopOpacity={glass.flowOpacity * (1 - i * 0.22)} />
                  <Stop offset={0.4} stopColor={color} stopOpacity={glass.flowOpacity * 0.45 * (1 - i * 0.22)} />
                  <Stop offset={1} stopColor={color} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect width={100} height={100} fill={`url(#${gradientId})`} />
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
});

// Contain moving spots so they cannot enlarge the card's scrollable bounds on web.
const styles = StyleSheet.create({ layer: { overflow: 'hidden' } });
