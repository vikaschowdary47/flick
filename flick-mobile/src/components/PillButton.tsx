import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { tokens } from "../design/tokens";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  size?: "regular" | "large";
  accessibilityHint?: string;
};

export function PillButton({ label, onPress, disabled, busy, size = "regular", accessibilityHint }: Props) {
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        size === "large" && styles.large,
        pressed ? styles.pressed : tokens.shadows.sticker,
        inactive && styles.inactive,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={tokens.colors.textOnCoral} />
      ) : (
        <Text style={[styles.label, size === "large" && styles.largeLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: tokens.layout.inputHeight,
    paddingHorizontal: tokens.spacing.xl,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.coral,
    borderWidth: tokens.borderWidth.outline,
    borderColor: tokens.colors.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  large: {
    minHeight: tokens.layout.flickButtonHeight,
  },
  pressed: {
    ...tokens.shadows.stickerPressed,
    transform: [{ translateY: tokens.shadows.sticker.shadowOffset.height - tokens.shadows.stickerPressed.shadowOffset.height }],
  },
  inactive: {
    opacity: 0.6,
  },
  label: {
    color: tokens.colors.textOnCoral,
    fontFamily: tokens.fonts.extrabold,
    fontSize: tokens.fontSizes.cardTitle,
  },
  largeLabel: {
    fontSize: tokens.fontSizes.button,
  },
});
