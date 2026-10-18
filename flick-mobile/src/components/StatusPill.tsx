import { StyleSheet, Text, View } from "react-native";
import { tokens } from "../design/tokens";

export type Status = "connected" | "signedOut" | "offline";

const LABELS: Record<Status, string> = {
  connected: "Connected",
  signedOut: "Signed out",
  offline: "Offline",
};

const COLORS: Record<Status, string> = {
  connected: tokens.colors.connectedPill,
  signedOut: tokens.colors.signedOutPill,
  offline: tokens.colors.offlinePill,
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Status: ${LABELS[status]}`}
      style={[styles.pill, { backgroundColor: COLORS[status] }]}
    >
      <View style={styles.dot} />
      <Text style={styles.label}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radii.pill,
    borderWidth: tokens.borderWidth.outline,
    borderColor: tokens.colors.outline,
  },
  dot: {
    width: tokens.layout.statusDot,
    height: tokens.layout.statusDot,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.navy,
  },
  label: {
    color: tokens.colors.text,
    fontFamily: tokens.fonts.extrabold,
    fontSize: tokens.fontSizes.meta,
  },
});
