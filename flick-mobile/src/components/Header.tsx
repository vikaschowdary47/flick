import { StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { LogoMark } from "./LogoMark";
import { StatusPill, type Status } from "./StatusPill";

export function Header({ status }: { status: Status }) {
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
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
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.wordmark,
    },
  });
