import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { formatBytes } from "../lib/format";
import { NUDGE_AT, oldestToRemove } from "../lib/freeUpSpace";
import type { Usage } from "../lib/limits";
import type { FileRow } from "../lib/types";
import { PillButton } from "./PillButton";

type Props = {
  usage: Usage | null;
  files: FileRow[];
  onRemove: (files: FileRow[]) => Promise<void>;
};

// At 80%+ of storage: a small banner, and a sheet that lists the oldest
// files to remove (never pinned ones) before removing them.
export function StorageNudge({ usage, files, onRemove }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!usage || dismissed) return null;
  const max = usage.maxStorageMb * 1024 * 1024;
  const share = max > 0 ? usage.storageUsedBytes / max : 0;
  if (share < NUDGE_AT) return null;

  const suggested = oldestToRemove(files, usage.storageUsedBytes, max);
  const freed = suggested.reduce((sum, file) => sum + file.size, 0);

  return (
    <>
      <View accessibilityRole="alert" style={styles.banner}>
        <Text style={styles.text}>
          You've used {Math.round(share * 100)}% of your {usage.maxStorageMb} MB
        </Text>
        <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.button} hitSlop={tokens.spacing.sm}>
          <Text style={styles.buttonLabel}>Free up space</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={() => setDismissed(true)} hitSlop={tokens.spacing.sm}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        {/* Full-screen dim behind the sheet, so its rounded corners show the dim, not the bright app. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close">
          <View style={styles.scrim} />
        </Pressable>
        <View style={styles.spacer} pointerEvents="none" />
        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          <Text accessibilityRole="header" style={styles.heading}>
            Free up space
          </Text>
          {suggested.length === 0 ? (
            <Text style={styles.body}>Everything left is pinned. Unpin or delete a file to make room.</Text>
          ) : (
            <>
              <Text style={styles.body}>
                Remove the {suggested.length === 1 ? "oldest file" : `${suggested.length} oldest files`} (
                {formatBytes(freed)}) from all your devices? Pinned files are kept.
              </Text>
              <View style={styles.list}>
                {suggested.slice(0, 6).map((file) => (
                  <Text key={file.id} style={styles.item} numberOfLines={1} ellipsizeMode="middle">
                    {file.name} · {formatBytes(file.size)}
                  </Text>
                ))}
                {suggested.length > 6 && <Text style={styles.item}>+{suggested.length - 6} more</Text>}
              </View>
              <PillButton
                label={suggested.length === 1 ? "Remove it" : `Remove ${suggested.length} files`}
                busy={busy}
                onPress={async () => {
                  setBusy(true);
                  await onRemove(suggested);
                  setBusy(false);
                  setOpen(false);
                }}
              />
            </>
          )}
          <PillButton label="Not now" variant="secondary" onPress={() => setOpen(false)} />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.sm,
      paddingVertical: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radii.card,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.offlinePill,
    },
    text: {
      flex: 1,
      color: c.onColor,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
    },
    button: {
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.xs,
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.fallbackTile,
    },
    buttonLabel: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.meta,
    },
    close: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.cardTitle,
      paddingHorizontal: tokens.spacing.xs,
    },
    scrim: {
      flex: 1,
      backgroundColor: c.scrim,
    },
    spacer: { flex: 1 },
    sheet: {
      gap: tokens.spacing.md,
      padding: tokens.layout.screenPadding,
      borderTopLeftRadius: tokens.radii.window,
      borderTopRightRadius: tokens.radii.window,
      borderWidth: tokens.borderWidth.outline,
      borderBottomWidth: 0,
      borderColor: c.outline,
      backgroundColor: c.background,
      // Side outlines just off-screen: only the top edge and its rounded corners
      // are outlined, nothing traces the phone's own screen corners.
      marginHorizontal: -tokens.borderWidth.outline,
    },
    heading: {
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.heading,
    },
    body: {
      color: c.text,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.body,
    },
    list: {
      gap: tokens.spacing.xs,
    },
    item: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
    },
  });
