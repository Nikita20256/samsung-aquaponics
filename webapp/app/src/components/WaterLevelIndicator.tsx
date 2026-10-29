import { useEffect, useId, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors } from '../theme';
import useLoadingProgress from '../hooks/useLoadingProgress';

const bubbles = [
  { x: 18, radius: 2.8, duration: 3.1, offset: 0 },
  { x: 38, radius: 1.8, duration: 2.6, offset: 0.38 },
  { x: 27, radius: 2.2, duration: 3.7, offset: 0.68 },
  { x: 47, radius: 1.4, duration: 2.9, offset: 0.18 },
  { x: 15, radius: 1.3, duration: 4.2, offset: 0.82 },
];

export default function WaterLevelIndicator({ water }: { water: number | null }) {
  // The hardware exposes a binary float sensor, not a percentage measurement.
  const level = water === null ? 0 : water > 0 ? 80 : 15;
  const progress = useLoadingProgress(12000);
  const [time, setTime] = useState(0);
  useEffect(() => {
    const listener = progress.addListener(({ value }) => setTime(value * 12));
    return () => progress.removeListener(listener);
  }, [progress]);
  const moving = time > 0 && water !== null;
  const label = water === null ? 'Нет данных' : water > 0 ? 'В норме' : 'Мало воды';
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const surface = 114 - 110 * level / 100;
  const wave = (phase: number, amplitude: number) => Array.from({ length: 25 }, (_, i) => {
    const x = 4 + 58 * i / 24;
    const y = surface + Math.sin(i / 24 * Math.PI * 2 + phase) * amplitude;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  const frontWave = wave(time * 2.1, moving ? 2 : 0);
  const backWave = wave(-time * 1.5 + 1.2, moving ? 1.4 : 0);
  const waterPath = `${frontWave} V114 H4 Z`;

  return (
    <>
      <View style={styles.value} accessible accessibilityLabel={`Уровень воды: ${label}`}>
        <View style={styles.readingRow}>
          <Text style={[styles.number, { fontSize: 24, letterSpacing: -0.5 }]}>{label}</Text>
        </View>
        <Text style={styles.caption}>Уровень воды</Text>
        <View style={styles.progress}>
          <View style={[styles.fill, { width: `${level}%` }]}><View style={styles.dot} /></View>
        </View>
      </View>
      <View style={styles.tank}
        accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
        <Svg width={66} height={118} viewBox="0 0 66 118">
          <Defs>
            <LinearGradient id={`${id}fill`} x1={0} y1={surface} x2={0} y2={114} gradientUnits="userSpaceOnUse">
              <Stop stopColor="#87BF60" stopOpacity={0.48} />
              <Stop offset={1} stopColor="#4F873B" stopOpacity={0.1} />
            </LinearGradient>
            <ClipPath id={`${id}tank`}><Rect x={4} y={4} width={58} height={110} rx={15} /></ClipPath>
            <ClipPath id={`${id}water`}><Path d={waterPath} /></ClipPath>
          </Defs>
          <Rect x={0.6} y={0.6} width={64.8} height={116.8} rx={18} fill="#101F12" stroke="#42633A" strokeWidth={1.2} />
          <G clipPath={`url(#${id}tank)`}>
            <Path d={`${backWave} V114 H4 Z`} fill="#87BF60" fillOpacity={0.12} />
            <Path d={waterPath} fill={`url(#${id}fill)`} />
            <Path d={backWave} fill="none" stroke="#B8DE96" strokeOpacity={0.25} strokeWidth={1} />
            <G clipPath={`url(#${id}water)`}>
              {moving && bubbles.map((bubble, i) => {
                const progress = (time / bubble.duration + bubble.offset) % 1;
                return (
                  <Circle key={i}
                    cx={bubble.x + Math.sin(time * 2 + i * 1.7) * 2}
                    cy={112 - progress * (114 - surface)}
                    r={bubble.radius * (0.65 + progress * 0.35)} fill="none" stroke="#B3DF8F"
                    strokeWidth={0.9} opacity={Math.min(1, progress * 7, (1 - progress) * 7) * 0.65} />
                );
              })}
            </G>
            <Path d={frontWave} fill="none" stroke="#A3D17B" strokeOpacity={0.85} strokeWidth={1.4} />
            <Rect x={7} y={12} width={2} height={92} rx={1} fill="#C7E7B0" fillOpacity={0.08} />
          </G>
          {[21, 43, 65, 87].map(y => <Path key={y} d={`M49 ${y} h7`} stroke="#A0C18A" strokeOpacity={0.35} />)}
        </Svg>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  value: { marginTop: 12, width: '58%' },
  readingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  number: { color: '#EBF6E4', fontSize: 46, lineHeight: 51, fontWeight: '600', letterSpacing: -1.8, fontVariant: ['tabular-nums'] },
  unit: { color: '#A5C393', fontSize: 22 },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  progress: { marginTop: 10, maxWidth: 161, height: 4, backgroundColor: colors.track, borderRadius: 3 },
  fill: { height: 4, borderRadius: 3, backgroundColor: '#79B653' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#AACF85', position: 'absolute', right: -3, top: -1 },
  tank: { position: 'absolute', right: 22, top: 19, width: 66, height: 118, transform: [{ scale: 0.89 }] },
});
