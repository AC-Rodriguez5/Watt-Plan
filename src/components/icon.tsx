import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

type IconProps = {
  /** Material Symbols name, e.g. "chevron_right". */
  name: AndroidSymbol;
  size?: number;
  color: ColorValue;
};

/** Android-only Material Symbol. */
export function Icon({ name, size = 24, color }: IconProps) {
  return <SymbolView name={{ android: name }} size={size} tintColor={color} />;
}
