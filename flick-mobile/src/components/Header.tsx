import { StyleSheet, Text, View } from "react-native";
import { tokens } from "../design/tokens";
import { LogoMark } from "./LogoMark";
import { StatusPill, type Status } from "./StatusPill";

export function Header({ status }: { status: Status }) {
  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <LogoMark />
        <Text accessibilityRole="header" style={styles.wordmark}>
          flick
        </Text>
      </View>
      <StatusPill status={status} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: tokens.layout.minTouchTarget,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  wordmark: {
    color: tokens.colors.text,
    fontFamily: tokens.fonts.extrabold,
    fontSize: tokens.fontSizes.wordmark,
  },
});
