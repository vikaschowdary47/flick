import { useRef } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import type { UploadSource } from "../hooks/useUpload";

type Props = {
  visible: boolean;
  onPick: (source: UploadSource) => void;
  onClose: () => void;
};

const OPTIONS: { source: UploadSource; label: string; hint: string; fill: keyof Palette }[] = [
  { source: "photos", label: "Photos", hint: "Pick photos and videos", fill: "imageTile" },
  { source: "files", label: "Files", hint: "Pick a file", fill: "documentTile" },
  { source: "camera", label: "Take photo", hint: "Open the camera", fill: "archiveTile" },
];

// Small sticker-style sheet that opens from the "eqlDrop it" button.
export function SourceSheet({ visible, onPick, onClose }: Props) {
  const styles = useThemedStyles(makeStyles);
  // iOS can't present the picker while this sheet is still sliding away,
  // so remember the choice and open it once the sheet has dismissed.
  const pending = useRef<UploadSource | null>(null);
  const choose = (source: UploadSource) => {
    onClose();
    if (Platform.OS === "ios") pending.current = source;
    else onPick(source);
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      onDismiss={() => {
        const source = pending.current;
        pending.current = null;
        if (source) onPick(source);
      }}
    >
      <Pressable accessibilityLabel="Close" style={styles.scrim} onPress={onClose} />
      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        <Text accessibilityRole="header" style={styles.heading}>
          What are you sending?
        </Text>
        <View style={styles.options}>
          {OPTIONS.map((option) => (
            <Pressable
              key={option.source}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityHint={option.hint}
              onPress={() => choose(option.source)}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: styles.fills[option.fill] },
                pressed ? styles.pressed : styles.raised,
              ]}
            >
              <Text style={styles.label}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (c: Palette) => ({
  fills: c,
  ...StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: c.scrim,
    },
    sheet: {
      gap: tokens.spacing.lg,
      padding: tokens.layout.screenPadding,
      borderTopLeftRadius: tokens.radii.window,
      borderTopRightRadius: tokens.radii.window,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.background,
    },
    heading: {
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.cardTitle,
    },
    options: {
      gap: tokens.spacing.md,
    },
    option: {
      minHeight: tokens.layout.inputHeight,
      justifyContent: "center",
      paddingHorizontal: tokens.spacing.lg,
      borderRadius: tokens.radii.card,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
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
    label: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.body,
    },
  }),
});
