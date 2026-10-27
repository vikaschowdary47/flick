import { StyleSheet, Text, View } from "react-native";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";

export type Status = "connected" | "signedOut" | "offline";

const LABELS: Record<Status, string> = {
  connected: "Connected",
  signedOut: "Signed out",
  offline: "Offline",
};


export function StatusPill({ status }: { status: Status }) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Status: ${LABELS[status]}`}
      style={[styles.pill, { backgroundColor: palette.fill }]}
    >
      <View style={[styles.dot, status === "connected" && styles.liveDot]} />
      <Text style={styles.label}>{LABELS[status]}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.xs + 2,
      height: 32,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radii.pill,
    },
    dot: {
      width: tokens.layout.statusDot - 1,
      height: tokens.layout.statusDot - 1,
      borderRadius: tokens.radii.pill,
      backgroundColor: c.textMuted,
    },
    liveDot: {
      backgroundColor: "#34C46E", // live green, same as the desktop
    },
    label: {
      color: c.text,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
    },
  });
