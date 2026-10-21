import { memo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { formatBytes, formatTimeLeft } from "../lib/format";
import type { FileRow } from "../lib/types";
import { extension, tileColor } from "./FileCard";

type Props = {
  file: FileRow;
  now: number;
  sender: string; // "from …" or empty
  opening: boolean; // downloading for Preview/Share
  selected: boolean; // its menu is open
  onMenu: (file: FileRow, pageY: number) => void;
};

// Compact file row (52pt): sticker icon colored by type, name, then
// size · time left · sender. Tap or long-press opens the usual menu.
export const CompactFileRow = memo(function CompactFileRow({ file, now, sender, opening, selected, onMenu }: Props) {
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
      style={[styles.row, selected && styles.selected]}
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
      height: tokens.compact.rowHeight,
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.compact.padding,
      paddingHorizontal: tokens.compact.padding,
      borderRadius: tokens.radii.card,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.card,
      ...tokens.shadows.stickerPressed,
      shadowColor: c.shadow,
    },
    selected: {
      backgroundColor: c.doneCard,
    },
    icon: {
      width: tokens.compact.icon,
      height: tokens.compact.icon,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: tokens.compact.iconRadius,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
    },
    iconText: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.compact.meta - 4,
    },
    body: {
      flex: 1,
      gap: 1,
    },
    name: {
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.compact.title,
    },
    meta: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.compact.meta,
    },
    pin: {
      width: tokens.layout.statusDot + 2,
      height: tokens.layout.statusDot + 2,
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.pinBadge,
    },
  });
