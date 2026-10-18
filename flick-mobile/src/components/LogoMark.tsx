import { StyleSheet, Text, View } from "react-native";
import { tokens } from "../design/tokens";

type Props = { size?: number };

export function LogoMark({ size = tokens.layout.logoMark }: Props) {
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

const styles = StyleSheet.create({
  mark: {
    backgroundColor: tokens.colors.coral,
    borderWidth: tokens.borderWidth.outline,
    borderColor: tokens.colors.outline,
    alignItems: "center",
    justifyContent: "center",
    ...tokens.shadows.stickerPressed,
  },
  arrow: {
    color: tokens.colors.textOnCoral,
    fontFamily: tokens.fonts.extrabold,
  },
});
