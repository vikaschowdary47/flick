import { memo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { formatTimeLeft } from "../lib/format";
import type { FileRow } from "../lib/types";
import { extension } from "./FileCard";

type Props = {
  file: FileRow;
  size: number; // square side, from the grid width
  now: number;
  sender: string;
  opening: boolean;
  selected: boolean;
  onMenu: (file: FileRow, pageY: number) => void;
};

// One square in the compact image grid. A colored sticker tile for now;
// the thumbnail commit fills it with a ~200px preview.
export const ImageTile = memo(function ImageTile({ file, size, now, sender, opening, selected, onMenu }: Props) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const timeLeft = opening ? "Downloading…" : formatTimeLeft(file.created_at, now);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${file.name}${file.pinned ? ", pinned" : ""}, ${timeLeft}${sender ? `, ${sender}` : ""}`}
      accessibilityHint="Opens Preview, Share, Pin and Delete"
      onPress={(event) => onMenu(file, event.nativeEvent.pageY)}
      onLongPress={(event) => onMenu(file, event.nativeEvent.pageY)}
      style={[styles.tile, { width: size, height: size }, selected && styles.selected]}
    >
      <Text style={styles.label}>{extension(file.name)}</Text>
      {file.pinned && <View style={styles.pin} />}
      {opening ? (
        <ActivityIndicator style={styles.spinner} color={palette.onColor} />
      ) : (
        <Text style={styles.time} numberOfLines={1}>
          {timeLeft}
        </Text>
      )}
    </Pressable>
  );
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    tile: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: tokens.radii.card,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.imageTile,
      ...tokens.shadows.stickerPressed,
      shadowColor: c.shadow,
    },
    selected: {
      backgroundColor: c.doneCard,
    },
    label: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.compact.title,
    },
    time: {
      position: "absolute",
      bottom: tokens.spacing.xs + 2,
      left: tokens.spacing.sm,
      right: tokens.spacing.sm,
      textAlign: "center",
      color: c.onColor,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.compact.meta - 1,
    },
    spinner: {
      position: "absolute",
      bottom: tokens.spacing.xs,
    },
    pin: {
      position: "absolute",
      top: tokens.spacing.sm,
      left: tokens.spacing.sm,
      width: tokens.layout.statusDot + 2,
      height: tokens.layout.statusDot + 2,
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.pinBadge,
    },
  });
