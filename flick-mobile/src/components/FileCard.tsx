import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { tokens } from "../design/tokens";
import { formatBytes } from "../lib/format";

export type CardTone = "sending" | "done" | "error" | "plain";

const BACKGROUNDS: Record<CardTone, string> = {
  sending: tokens.colors.sendingCard,
  done: tokens.colors.lilac,
  error: tokens.colors.white,
  plain: tokens.colors.white,
};

type Props = {
  name: string;
  size: number;
  mimeType: string | null;
  tone: CardTone;
  status: string;
  badge?: string;
};

export function tileColor(mimeType: string | null, name: string): string {
  const type = mimeType ?? "";
  if (type.startsWith("image/")) return tokens.colors.imageTile;
  if (type === "application/pdf" || type.startsWith("text/") || /\.(docx?|pages|pdf|txt|md|rtf|key|pptx?|xlsx?|numbers|csv)$/i.test(name))
    return tokens.colors.documentTile;
  if (/zip|compressed|tar|gzip|7z|rar/.test(type)) return tokens.colors.archiveTile;
  return tokens.colors.fallbackTile;
}

function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1, dot + 5).toUpperCase() : "FILE";
}

export function FileCard({ name, size, mimeType, tone, status, badge }: Props) {
  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${formatBytes(size)}, ${status}`}
      style={[
        styles.card,
        { backgroundColor: BACKGROUNDS[tone] },
        tone === "error" && styles.errorCard,
      ]}
    >
      <View style={[styles.tile, { backgroundColor: tileColor(mimeType, name) }]}>
        <Text style={styles.tileText}>{extension(name)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="middle">
          {name}
        </Text>
        <Text style={styles.meta} numberOfLines={2}>
          {formatBytes(size)} · {status}
        </Text>
      </View>
      {tone === "sending" && <ActivityIndicator color={tokens.colors.navy} />}
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderRadius: tokens.radii.card,
    borderWidth: tokens.borderWidth.outline,
    borderColor: tokens.colors.outline,
    ...tokens.shadows.sticker,
  },
  errorCard: {
    borderColor: tokens.colors.errorOutline,
  },
  tile: {
    width: tokens.layout.thumbnail,
    height: tokens.layout.thumbnail,
    borderRadius: tokens.radii.thumbnail,
    borderWidth: tokens.borderWidth.outline,
    borderColor: tokens.colors.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: {
    color: tokens.colors.text,
    fontFamily: tokens.fonts.extrabold,
    fontSize: tokens.fontSizes.meta,
  },
  body: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  title: {
    color: tokens.colors.text,
    fontFamily: tokens.fonts.extrabold,
    fontSize: tokens.fontSizes.cardTitle,
  },
  meta: {
    color: tokens.colors.muted,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.meta,
  },
  badge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.mint,
    borderWidth: tokens.borderWidth.outline,
    borderColor: tokens.colors.outline,
  },
  badgeText: {
    color: tokens.colors.text,
    fontFamily: tokens.fonts.extrabold,
    fontSize: tokens.fontSizes.meta,
  },
});
