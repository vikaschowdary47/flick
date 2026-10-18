import { Pressable, StyleSheet, View } from "react-native";
import { tokens } from "../design/tokens";
import { CloseIcon, EyeIcon } from "./Icons";

type Props = {
  fileName: string;
  onPreview: () => void;
  onRemove: () => void;
};

export function FileActions({ fileName, onPreview, onRemove }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Preview ${fileName}`}
        onPress={onPreview}
        style={({ pressed }) => [styles.button, pressed ? tokens.shadows.stickerPressed : tokens.shadows.sticker]}
      >
        <EyeIcon />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${fileName} from all devices`}
        onPress={onRemove}
        style={({ pressed }) => [styles.button, pressed ? tokens.shadows.stickerPressed : tokens.shadows.sticker]}
      >
        <CloseIcon />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
  },
  button: {
    width: tokens.layout.minTouchTarget,
    height: tokens.layout.minTouchTarget,
    borderRadius: tokens.radii.pill,
    borderWidth: tokens.borderWidth.outline,
    borderColor: tokens.colors.outline,
    backgroundColor: tokens.colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
});
