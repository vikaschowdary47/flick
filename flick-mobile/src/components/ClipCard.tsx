import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { formatAgo, siteName, type ClipRow } from "../lib/clips";
import { CloseIcon } from "./Icons";

type Props = {
  clip: ClipRow;
  sender: string; // "from …" or empty
  now: number;
  onDelete: () => void;
};

const COPIED_MS = 1500;

// Sticker card for one clip. Tapping the card or Copy copies it.
export function ClipCard({ clip, sender, now, onDelete }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    await Clipboard.setStringAsync(clip.content);
    setCopied(true);
  };

  const isLink = clip.kind === "link";
  const meta = [sender, formatAgo(clip.created_at, now)].filter(Boolean).join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isLink ? `Link, ${siteName(clip.content)}` : clip.content}. ${meta}`}
      accessibilityHint="Copies it"
      onPress={() => void copy()}
      style={[styles.card, isLink ? styles.link : styles.text]}
    >
      <View style={styles.body}>
        <Text style={styles.content} numberOfLines={2} ellipsizeMode="tail">
          {isLink ? siteName(clip.content) : clip.content}
        </Text>
        <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
          {copied ? "Copied!" : meta}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Copy"
        onPress={() => void copy()}
        style={styles.copyButton}
      >
        <Text style={styles.copyLabel}>{copied ? "Copied!" : "Copy"}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete clip from all devices"
        onPress={onDelete}
        style={styles.iconButton}
        hitSlop={tokens.spacing.xs}
      >
        <CloseIcon />
      </Pressable>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.sm,
      padding: tokens.spacing.md,
      borderRadius: tokens.radii.card,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      ...tokens.shadows.sticker,
      shadowColor: c.shadow,
    },
    // Colored fills keep onColor text readable in dark mode too.
    text: {
      backgroundColor: c.doneCard,
    },
    link: {
      backgroundColor: c.archiveTile,
    },
    body: {
      flex: 1,
      gap: tokens.spacing.xs,
    },
    content: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.body,
    },
    meta: {
      color: c.onColor,
      opacity: 0.75,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
    },
    copyButton: {
      minHeight: tokens.layout.minTouchTarget,
      justifyContent: "center",
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.fallbackTile,
    },
    copyLabel: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.meta,
    },
    iconButton: {
      width: tokens.layout.minTouchTarget,
      height: tokens.layout.minTouchTarget,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.fallbackTile,
    },
  });
