import { StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";

type Props = { size?: number };

export function LogoMark({ size = tokens.layout.logoMark }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.34 }]}
    >
      <Text style={[styles.arrow, { fontSize: size * 0.6 }]}>↗</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    mark: {
      backgroundColor: c.accent,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      alignItems: "center",
      justifyContent: "center",
      ...tokens.shadows.stickerPressed,
      shadowColor: c.shadow,
    },
    arrow: {
      color: c.onAccent,
      fontFamily: tokens.fonts.extrabold,
    },
  });
