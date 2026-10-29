import { Animated, StyleSheet, View } from 'react-native';

import useLoadingProgress from '../hooks/useLoadingProgress';

export default function LoadingDots() {
  const progress = useLoadingProgress(1500);

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.dots}
    >
      {[0, 1, 2].map((index) => {
        const start = 0.02 + index * 0.18;
        const inputRange = [0, start, start + 0.18, start + 0.36, 1];

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                opacity: progress.interpolate({
                  inputRange,
                  outputRange: [0.45, 0.45, 1, 0.45, 0.45],
                }),
                transform: [{
                  scale: progress.interpolate({
                    inputRange,
                    outputRange: [0.75, 0.75, 1.4, 0.75, 0.75],
                  }),
                }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    height: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6BAF47',
  },
});
