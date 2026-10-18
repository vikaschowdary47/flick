import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "../design/tokens";
import type { UploadState } from "../lib/types";
import { FileCard } from "./FileCard";

type Props = { state: UploadState; onDismiss: () => void };

export function UploadCard({ state, onDismiss }: Props) {
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
    state.kind === "uploading" ? "On its way…" : state.kind === "done" ? "Got it! Flicked to your devices" : state.message;

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

const styles = StyleSheet.create({
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
    color: tokens.colors.muted,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.meta,
  },
  errorOnly: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radii.card,
    borderWidth: tokens.borderWidth.outline,
    borderColor: tokens.colors.errorOutline,
    backgroundColor: tokens.colors.white,
  },
  errorText: {
    color: tokens.colors.text,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.body,
  },
});
