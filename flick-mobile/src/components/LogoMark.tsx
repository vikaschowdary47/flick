import { Image, StyleSheet, View } from "react-native";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";

type Props = { size?: number };

export function LogoMark({ size = tokens.layout.logoMark }: Props) {
  const { scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.34 }]}
    >
      <Image
        accessibilityIgnoresInvertColors
        source={scheme === "dark" ? require("../../assets/icon-dark.png") : require("../../assets/icon.png")}
        style={[styles.image, { width: size, height: size, borderRadius: size * 0.34 }]}
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    mark: {
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    image: {
      overflow: "hidden",
    },
  });
