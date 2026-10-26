import { memo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { formatBytes, formatTimeLeft } from "../lib/format";
import type { FileRow } from "../lib/types";
import { extension, tileColor } from "./FileCard";

// Where the row sits in its group: rows in a section share one rounded card.
export type GroupPosition = "single" | "first" | "middle" | "last";

type Props = {
  file: FileRow;
  position?: GroupPosition;
  now: number;
  sender: string; // "from …" or empty
  opening: boolean; // downloading for Preview/Share
  selected: boolean; // its menu is open
  onMenu: (file: FileRow, pageY: number) => void;
};

// Compact file row (52pt): sticker icon colored by type, name, then
// size · time left · sender. Tap or long-press opens the usual menu.
export const CompactFileRow = memo(function CompactFileRow({ file, now, sender, opening, selected, onMenu, position = "single" }: Props) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const meta = [formatBytes(file.size), opening ? "Downloading…" : formatTimeLeft(file, now), sender]
    .filter(Boolean)
    .join(" · ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${file.name}${file.pinned ? ", pinned" : ""}, ${meta}`}
      accessibilityHint="Opens Preview, Share, Pin and Delete"
      onPress={(event) => onMenu(file, event.nativeEvent.pageY)}
      onLongPress={(event) => onMenu(file, event.nativeEvent.pageY)}
      style={({ pressed }) => [
        styles.row,
        (position === "first" || position === "single") && styles.top,
        (position === "last" || position === "single") && styles.bottom,
        (position === "middle" || position === "last") && styles.divided,
        (selected || pressed) && styles.selected,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: tileColor(file.mime_type, file.name, palette) }]}>
        <Text style={styles.iconText}>{extension(file.name)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="middle">
          {file.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
          {meta}
        </Text>
      </View>
      {file.pinned && <View style={styles.pin} />}
      {opening && <ActivityIndicator color={palette.text} />}
    </Pressable>
  );
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      height: tokens.compact.rowHeight + 8,
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.md,
      backgroundColor: c.card,
      borderLeftWidth: tokens.borderWidth.outline,
      borderRightWidth: tokens.borderWidth.outline,
      borderColor: c.hairline,
    },
    top: {
      borderTopWidth: tokens.borderWidth.outline,
      borderTopLeftRadius: tokens.radii.card,
      borderTopRightRadius: tokens.radii.card,
    },
    bottom: {
      borderBottomWidth: tokens.borderWidth.outline,
      borderBottomLeftRadius: tokens.radii.card,
      borderBottomRightRadius: tokens.radii.card,
    },
    divided: {
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    selected: {
      backgroundColor: c.fill,
    },
    icon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: tokens.radii.thumbnail,
    },
    iconText: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.compact.meta - 3,
    },
    body: {
      flex: 1,
      gap: 1,
    },
    name: {
      color: c.text,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.compact.title + 1,
    },
    meta: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.compact.meta,
    },
    pin: {
      width: tokens.layout.statusDot,
      height: tokens.layout.statusDot,
      borderRadius: tokens.radii.pill,
      backgroundColor: c.accent,
    },
  });
