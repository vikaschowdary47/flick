import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  size?: "regular" | "large";
  variant?: "primary" | "secondary";
  accessibilityHint?: string;
  icon?: ReactNode;
};

export function PillButton({
  label,
  onPress,
  disabled,
  busy,
  size = "regular",
  variant = "primary",
  accessibilityHint,
  icon,
}: Props) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const inactive = disabled || busy;
  const secondary = variant === "secondary";
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
        secondary && styles.secondary,
        size === "large" && styles.large,
        pressed ? styles.pressed : styles.raised,
        inactive && styles.inactive,
      ]}
    >
      <View style={styles.content}>
        {busy ? (
          <ActivityIndicator color={secondary ? palette.text : palette.onAccent} />
        ) : (
          icon
        )}
        <Text
          style={[styles.label, secondary && styles.secondaryLabel, size === "large" && styles.largeLabel]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    button: {
      minHeight: tokens.layout.inputHeight,
      paddingHorizontal: tokens.spacing.xl,
      borderRadius: tokens.radii.pill,
      backgroundColor: c.accent,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: tokens.spacing.sm,
    },
    secondary: {
      backgroundColor: c.card,
    },
    large: {
      minHeight: tokens.layout.flickButtonHeight,
    },
    raised: {
      ...tokens.shadows.sticker,
      shadowColor: c.shadow,
    },
    pressed: {
      ...tokens.shadows.stickerPressed,
      shadowColor: c.shadow,
      transform: [{ translateY: tokens.shadows.sticker.shadowOffset.height - tokens.shadows.stickerPressed.shadowOffset.height }],
    },
    inactive: {
      opacity: 0.6,
    },
    label: {
      color: c.onAccent,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.cardTitle,
      textAlign: "center",
    },
    secondaryLabel: {
      color: c.text,
    },
    largeLabel: {
      fontSize: tokens.fontSizes.button,
    },
  });
