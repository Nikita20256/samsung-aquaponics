import { Animated, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import useLoadingProgress from '../hooks/useLoadingProgress';

type FishLoadingIndicatorProps = {
  /** The complete fish-loading SVG, with its original viewBox. */
  xml: string;
  size: number;
  artworkWidth?: number;
  artworkHeight?: number;
  durationMs?: number;
};

export default function FishLoadingIndicator({
  xml,
  size,
  artworkWidth = 328,
  artworkHeight = 367,
  durationMs = 4000,
}: FishLoadingIndicatorProps) {
  const progress = useLoadingProgress(durationMs);

  const rotation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const artworkScale = size / Math.max(artworkWidth, artworkHeight);

  return (
    <Animated.View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[
        styles.artwork,
        { width: size, height: size, transform: [{ rotate: rotation }] },
      ]}
    >
      <View
        style={{
          position: 'absolute',
          width: artworkWidth,
          height: artworkHeight,
          left: (size - artworkWidth) / 2,
          top: (size - artworkHeight) / 2,
          transform: [{ scale: artworkScale }],
        }}
      >
        <SvgXml xml={xml} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
