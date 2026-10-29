import { useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import fishLoadingSvg from '../../assets/loading/fish-loading.svg';
import FishLoadingIndicator from '../components/FishLoadingIndicator';
import LoadingDots from '../components/LoadingDots';
import useLoadingProgress from '../hooks/useLoadingProgress';

export default function LoadingScreen() {
  const insets = useSafeAreaInsets();
  const backgroundProgress = useLoadingProgress(10000, true);
  const backgroundScale = backgroundProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const [screen, setScreen] = useState({ width: 0, height: 0 });
  const [stageHeight, setStageHeight] = useState(0);
  const [loadingHeight, setLoadingHeight] = useState(0);
  const artworkSize = Math.max(
    0,
    Math.min(screen.width * 0.92, stageHeight - 53 - loadingHeight, 400),
  );

  return (
    <View style={styles.screen} onLayout={({ nativeEvent: { layout } }) => setScreen({ width: layout.width, height: layout.height })}>
      <Animated.Image
        source={require('../../assets/loading/rainforest-background.png')}
        style={[StyleSheet.absoluteFill, { transform: [{ scale: backgroundScale }] }]}
        resizeMode="cover"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View
            style={[
              styles.brand,
              { paddingTop: Math.max(0, 80 - insets.top) },
            ]}
          >
            <Text accessibilityRole="header" style={styles.brandName}>
              FISH &amp; GREENS
            </Text>
            <Text style={styles.tagline}>аквапоника</Text>
          </View>

          <View
            style={styles.stage}
            onLayout={({ nativeEvent: { layout } }) => {
              setStageHeight(layout.height);
            }}
          >
            {artworkSize > 0 && (
              <FishLoadingIndicator xml={fishLoadingSvg} size={artworkSize} />
            )}
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Загрузка"
              accessibilityState={{ busy: true }}
              style={styles.loading}
              onLayout={({ nativeEvent: { layout } }) => {
                setLoadingHeight(layout.height);
              }}
            >
              <LoadingDots />
              <Text style={styles.loadingLabel}>Загрузка</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D1A0D',
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  brand: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 67,
    gap: 4,
  },
  brandName: {
    color: '#6BAF47',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  tagline: {
    color: '#4A7A36',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 1,
    textAlign: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  loading: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 53,
    gap: 10,
  },
  loadingLabel: {
    color: '#4A7A36',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '500',
    textAlign: 'center',
  },
});
