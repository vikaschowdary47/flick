import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import type { UploadState } from "../lib/types";
import { FileCard } from "./FileCard";
import { APP_NAME } from "../lib/appName";

type Props = { state: UploadState; onDismiss: () => void };

export function UploadCard({ state, onDismiss }: Props) {
  const styles = useThemedStyles(makeStyles);
  if (state.kind === "idle") return null;

  if (state.kind === "error" && !state.file) {
    return (
      <View accessibilityRole="alert" style={styles.errorOnly}>
        <Text style={styles.errorText}>{state.message}</Text>
      </View>
    );
  }

  const file = state.file!;
  const tone = state.kind === "uploading" ? "sending" : state.kind === "done" ? "done" : "error";
  const status =
    state.kind === "uploading" ? "On its way…" : state.kind === "done" ? `Got it! Sent with ${APP_NAME}` : state.message;

  return (
    <View accessibilityLiveRegion="polite" style={styles.wrap}>
      <FileCard
        name={file.name}
        size={file.size}
        mimeType={file.mimeType}
        tone={tone}
        status={status}
      />
      {state.kind !== "uploading" && (
        <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.dismiss}>
          <Text style={styles.dismissText}>Dismiss</Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      transform: [{ rotate: `${tokens.motion.cardTiltMinDeg}deg` }],
    },
    dismiss: {
      alignSelf: "flex-end",
      minHeight: tokens.layout.minTouchTarget,
      justifyContent: "center",
      paddingHorizontal: tokens.spacing.sm,
    },
    dismissText: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
    },
    errorOnly: {
      padding: tokens.spacing.md,
      borderRadius: tokens.radii.card,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.error,
      backgroundColor: c.card,
    },
    errorText: {
      color: c.text,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.body,
    },
  });
