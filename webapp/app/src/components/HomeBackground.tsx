import { BlurTargetView } from 'expo-blur';
import { PropsWithChildren, useRef } from 'react';
import { Image, StyleSheet, View, type ViewInstance } from 'react-native';

import { GlassBackgroundContext } from '../context/GlassBackgroundContext';

export default function HomeBackground({ children }: PropsWithChildren) {
  const target = useRef<ViewInstance>(null);

  return (
    <GlassBackgroundContext.Provider value={target}>
      <View style={styles.screen}>
        <BlurTargetView ref={target} style={StyleSheet.absoluteFill} pointerEvents="none"
          accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Image source={require('../../assets/home/background.png')}
            style={[StyleSheet.absoluteFill, styles.image]} resizeMode="cover" accessible={false} />
        </BlurTargetView>
        {children}
      </View>
    </GlassBackgroundContext.Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09170E', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});
