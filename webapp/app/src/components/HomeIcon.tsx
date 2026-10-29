import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import bell from '../../assets/home/icons/bell.svg';
import control from '../../assets/home/icons/control.svg';
import drop from '../../assets/home/icons/drop.svg';
import home from '../../assets/home/icons/home.svg';
import sensors from '../../assets/home/icons/sensors.svg';
import soil from '../../assets/home/icons/soil.svg';
import sun from '../../assets/home/icons/sun.svg';
import temperature from '../../assets/home/icons/temperature.svg';
import user from '../../assets/home/icons/user.svg';

const icons = { bell, control, drop, home, sensors, soil, sun, temperature, user };
export type HomeIconName = keyof typeof icons;

export default function HomeIcon({ name, dimmed = false, size = 24 }: {
  name: HomeIconName;
  dimmed?: boolean;
  size?: number;
}) {
  return (
    <View accessible={false} accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, opacity: dimmed ? 0.65 : 1 }}>
      <SvgXml xml={icons[name]} width={size} height={size} />
    </View>
  );
}
