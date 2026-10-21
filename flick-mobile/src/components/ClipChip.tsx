import { memo, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { formatAgo, siteName, type ClipRow } from "../lib/clips";

type Props = {
  clip: ClipRow;
  sender: string;
  now: number;
  onDelete: (id: string) => void;
};

const COPIED_MS = 1500;

// Compact clip: one line (text or site name) and the time. Tap copies, × deletes.
export const ClipChip = memo(function ClipChip({ clip, sender, now, onDelete }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const isLink = clip.kind === "link";
  const text = isLink ? siteName(clip.content) : clip.content.replace(/\s+/g, " ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isLink ? `Link, ${text}` : text}. ${[sender, formatAgo(clip.created_at, now)].filter(Boolean).join(", ")}`}
      accessibilityHint="Copies it"
      onPress={async () => {
        await Clipboard.setStringAsync(clip.content);
        setCopied(true);
      }}
      style={[styles.chip, isLink ? styles.link : styles.text]}
    >
      <Text style={styles.content} numberOfLines={1} ellipsizeMode="tail">
        {copied ? "Copied!" : text}
      </Text>
      <Text style={styles.time}>{formatAgo(clip.created_at, now)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete clip from all devices"
        onPress={() => onDelete(clip.id)}
        hitSlop={tokens.spacing.sm}
        style={styles.delete}
      >
        <Text style={styles.deleteLabel}>×</Text>
      </Pressable>
    </Pressable>
  );
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    chip: {
      height: tokens.compact.chipHeight,
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.sm,
      paddingLeft: tokens.spacing.md,
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      ...tokens.shadows.stickerPressed,
      shadowColor: c.shadow,
    },
    text: {
      backgroundColor: c.doneCard,
    },
    link: {
      backgroundColor: c.archiveTile,
    },
    content: {
      flex: 1,
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.compact.title - 1,
    },
    time: {
      color: c.onColor,
      opacity: 0.75,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.compact.meta - 1,
    },
    delete: {
      width: tokens.compact.chipHeight,
      height: tokens.compact.chipHeight,
      alignItems: "center",
      justifyContent: "center",
    },
    deleteLabel: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.cardTitle,
    },
  });
