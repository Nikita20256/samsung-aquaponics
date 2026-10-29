import { BlurView } from 'expo-blur';
import { PropsWithChildren, useContext, useId, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { GlassBackgroundContext } from '../context/GlassBackgroundContext';
import { glass } from '../theme/glass';
import GlassColorFlow from './GlassColorFlow';

export default function GlassSurface({ children, style, radius = 20, navigation = false }: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  radius?: number;
  navigation?: boolean;
}>) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const blurTarget = useContext(GlassBackgroundContext);
  const lightRadians = glass.lightAngle * Math.PI / 180;
  const lightDirection = {
    x1: 0.5 + Math.cos(lightRadians) / 2,
    y1: 0.5 - Math.sin(lightRadians) / 2,
    x2: 0.5 - Math.cos(lightRadians) / 2,
    y2: 0.5 + Math.sin(lightRadians) / 2,
  };

  return (
    <View style={[styles.surface, { borderRadius: radius }, style]}
      onLayout={({ nativeEvent: { layout } }) => {
        setSize(previous => previous.width === layout.width && previous.height === layout.height
          ? previous : { width: layout.width, height: layout.height });
      }}>
      {blurTarget && (
        <BlurView style={StyleSheet.absoluteFill} intensity={glass.blurIntensity} tint="dark"
          pointerEvents="none" accessible={false} accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants" />
      )}
      {!navigation && size.width > 0 && size.height > 0 && <GlassColorFlow width={size.width} height={size.height} />}
      {size.width > 0 && size.height > 0 && (
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}
          pointerEvents="none" accessible={false}>
          <Defs>
            <LinearGradient id={`${id}fill`} {...lightDirection}>
              {(navigation ? [
                { offset: 0, color: '#C7DABB', opacity: 0.045 },
                { offset: 0.45, color: '#061910', opacity: 0.12 },
                { offset: 1, color: '#04130C', opacity: 0.2 },
              ] : [
                { offset: 0, color: '#DCEAD3', opacity: 0.025 },
                { offset: 0.18, color: '#071B11', opacity: 0.055 },
                { offset: 0.55, color: '#04130D', opacity: 0.09 },
                { offset: 1, color: '#03110A', opacity: 0.16 },
              ]).map(stop => <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />)}
            </LinearGradient>
            <LinearGradient id={`${id}edge`} {...lightDirection}>
              <Stop offset={0} stopColor="#E1EFD4" stopOpacity={0.62} />
              <Stop offset={0.34} stopColor="#B6CDA8" stopOpacity={0.3} />
              <Stop offset={0.65} stopColor="#8EAE99" stopOpacity={0.2} />
              <Stop offset={1} stopColor="#BFD9BE" stopOpacity={0.4} />
            </LinearGradient>
            <LinearGradient id={`${id}inner`} {...lightDirection}>
              <Stop offset={0} stopColor="#F1FFEA" stopOpacity={glass.lightOpacity * 0.45} />
              <Stop offset={0.4} stopColor="#E4F7D8" stopOpacity={0.015} />
              <Stop offset={1} stopColor="#B3D6A8" stopOpacity={0.05} />
            </LinearGradient>
          </Defs>
          <Rect x={glass.edgeWidth / 2} y={glass.edgeWidth / 2}
            width={Math.max(0, size.width - glass.edgeWidth)} height={Math.max(0, size.height - glass.edgeWidth)}
            rx={radius - glass.edgeWidth / 2} fill={`url(#${id}fill)`} stroke={`url(#${id}edge)`} strokeWidth={glass.edgeWidth} />
          <Rect x={1.6} y={1.6} width={Math.max(0, size.width - 3.2)} height={Math.max(0, size.height - 3.2)}
            rx={radius - 1.6} fill="none" stroke={`url(#${id}inner)`} strokeWidth={0.5} />
        </Svg>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ surface: { overflow: 'hidden' } });
