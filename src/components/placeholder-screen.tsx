import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography, themedStyles } from '@/constants/theme';

type PlaceholderScreenProps = {
  title: string;
  /** Pad for the status bar. Off for pushed screens, whose header already does. */
  topInset?: boolean;
};

/** Stand-in body for screens whose real UI is not built yet. */
export function PlaceholderScreen({ title, topInset = false }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={topInset ? ['top'] : []}>
      <Text style={styles.title}>{title}</Text>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.margin,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
}));
