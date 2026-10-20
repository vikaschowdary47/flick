import { Pressable, StyleSheet, View } from "react-native";
import { useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { CloseIcon, EyeIcon } from "./Icons";

type Props = {
  fileName: string;
  onPreview: () => void;
  onRemove: () => void;
};

export function FileActions({ fileName, onPreview, onRemove }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Preview ${fileName}`}
        onPress={onPreview}
        style={({ pressed }) => [styles.button, pressed ? styles.pressed : styles.raised]}
      >
        <EyeIcon />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${fileName} from all devices`}
        onPress={onRemove}
        style={({ pressed }) => [styles.button, pressed ? styles.pressed : styles.raised]}
      >
        <CloseIcon />
      </Pressable>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: tokens.spacing.sm,
    },
    button: {
      width: tokens.layout.minTouchTarget,
      height: tokens.layout.minTouchTarget,
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.fallbackTile,
      alignItems: "center",
      justifyContent: "center",
    },
    raised: { ...tokens.shadows.sticker, shadowColor: c.shadow },
    pressed: { ...tokens.shadows.stickerPressed, shadowColor: c.shadow },
  });
