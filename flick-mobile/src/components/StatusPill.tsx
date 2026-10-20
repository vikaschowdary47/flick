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

function pillColor(status: Status, c: Palette): string {
  if (status === "connected") return c.connectedPill;
  if (status === "offline") return c.offlinePill;
  return c.signedOutPill;
}

export function StatusPill({ status }: { status: Status }) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Status: ${LABELS[status]}`}
      style={[styles.pill, { backgroundColor: pillColor(status, palette) }]}
    >
      <View style={styles.dot} />
      <Text style={styles.label}>{LABELS[status]}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.xs,
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
    },
    dot: {
      width: tokens.layout.statusDot,
      height: tokens.layout.statusDot,
      borderRadius: tokens.radii.pill,
      backgroundColor: c.onColor,
    },
    label: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.meta,
    },
  });
