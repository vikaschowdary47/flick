import { StyleSheet, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";

type Props = { size?: number };

export function LogoMark({ size = tokens.layout.logoMark }: Props) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.34 }]}
    >
      <Svg width={size * 0.68} height={size * 0.68} viewBox="0 0 32 32">
        <Rect x="7" y="6" width="18" height="5" rx="2.5" fill={palette.onAccent} />
        <Path d="M8.5 16h15L16 26Z" fill={palette.onAccent} />
      </Svg>
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
  });
