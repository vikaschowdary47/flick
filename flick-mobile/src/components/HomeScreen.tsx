import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tokens } from "../design/tokens";
import { Header } from "./Header";
import { PillButton } from "./PillButton";

type Props = {
  onFlick: () => void;
  onSignOut: () => void;
};

export function HomeScreen({ onFlick, onSignOut }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.content}>
        <Header status="connected" />
        <Text accessibilityRole="header" style={styles.heading}>
          Flick it to all your devices
        </Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.thumbZone}>
        <PillButton label="Flick it" size="large" onPress={onFlick} />
        <Pressable
          accessibilityRole="button"
          onPress={onSignOut}
          style={styles.signOut}
          hitSlop={tokens.spacing.sm}
        >
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: tokens.layout.screenPadding,
    paddingTop: tokens.spacing.sm,
    gap: tokens.spacing.lg,
  },
  heading: {
    color: tokens.colors.text,
    fontFamily: tokens.fonts.extrabold,
    fontSize: tokens.fontSizes.heading,
  },
  spacer: { flex: 1 },
  thumbZone: {
    paddingHorizontal: tokens.layout.screenPadding,
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  signOut: {
    minHeight: tokens.layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutLabel: {
    color: tokens.colors.muted,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.meta,
  },
});
