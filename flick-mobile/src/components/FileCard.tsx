import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { formatBytes } from "../lib/format";
import { PinIcon } from "./Icons";

export type CardTone = "sending" | "done" | "error" | "plain";

function background(tone: CardTone, c: Palette): string {
  if (tone === "sending") return c.sendingCard;
  if (tone === "done") return c.doneCard;
  return c.card;
}

// Colored cards keep navy-style text in every theme; plain cards follow the theme.
function isColored(tone: CardTone): boolean {
  return tone === "sending" || tone === "done";
}

type Props = {
  name: string;
  size: number;
  mimeType: string | null;
  tone: CardTone;
  status: string;
  badge?: ReactNode; // small sticker next to the name (e.g. pinned)
  singleLineMeta?: boolean; // list cards keep one line so they don't grow
  children?: ReactNode; // trailing actions
};

export function tileColor(mimeType: string | null, name: string, c: Palette): string {
  const type = mimeType ?? "";
  if (type.startsWith("image/")) return c.imageTile;
  if (type === "application/pdf" || type.startsWith("text/") || /\.(docx?|pages|pdf|txt|md|rtf|key|pptx?|xlsx?|numbers|csv)$/i.test(name))
    return c.documentTile;
  if (/zip|compressed|tar|gzip|7z|rar/.test(type)) return c.archiveTile;
  return c.fallbackTile;
}

export function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1, dot + 5).toUpperCase() : "FILE";
}

export function FileCard({ name, size, mimeType, tone, status, badge, singleLineMeta, children }: Props) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const colored = isColored(tone);
  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${formatBytes(size)}, ${status}`}
      style={[
        styles.card,
        { backgroundColor: background(tone, palette) },
        tone === "error" && styles.errorCard,
      ]}
    >
      <View style={[styles.tile, { backgroundColor: tileColor(mimeType, name, palette) }]}>
        <Text style={styles.tileText}>{extension(name)}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, colored && styles.onColor]} numberOfLines={1} ellipsizeMode="middle">
            {name}
          </Text>
          {badge}
        </View>
        <Text
          style={[styles.meta, colored && styles.onColor]}
          numberOfLines={singleLineMeta ? 1 : 2}
          ellipsizeMode="tail"
        >
          {formatBytes(size)} · {status}
        </Text>
      </View>
      {tone === "sending" && <ActivityIndicator color={palette.onColor} />}
      {children}
    </View>
  );
}

// Small yellow sticker shown next to a pinned file's name.
export function PinBadge() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View accessibilityLabel="Pinned" style={styles.pinBadge}>
      <PinIcon size={tokens.fontSizes.meta} />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.md,
      padding: tokens.spacing.md,
      borderRadius: tokens.radii.card,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      ...tokens.shadows.sticker,
      shadowColor: c.shadow,
    },
    errorCard: {
      borderColor: c.error,
    },
    tile: {
      width: tokens.layout.thumbnail,
      height: tokens.layout.thumbnail,
      borderRadius: tokens.radii.thumbnail,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      alignItems: "center",
      justifyContent: "center",
    },
    tileText: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.meta,
    },
    body: {
      flex: 1,
      gap: tokens.spacing.xs,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.xs,
    },
    title: {
      flexShrink: 1,
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.cardTitle,
    },
    meta: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
    },
    onColor: {
      color: c.onColor,
    },
    pinBadge: {
      padding: tokens.spacing.xs / 2,
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.pinBadge,
    },
  });
