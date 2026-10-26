import { memo, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { FILE_LIFETIME_MS, expiresAt, formatBytes, formatExpiry } from "../lib/format";
import { localThumbnail } from "../lib/thumbs";
import type { FileRow } from "../lib/types";
import { extension, tileColor } from "./FileCard";
import { ShareIcon } from "./Icons";

type Props = {
  file: FileRow;
  now: number;
  sender: string; // "from …" or empty
  opening: boolean;
  selected: boolean;
  onMenu: (file: FileRow, pageY: number) => void;
  onShare: (file: FileRow) => void;
};

// Redesign v2: the newest file "lands" as a large card at the top of Files.
// Tapping it opens the same menu as any row; Share is one tap away.
// The thin amber line is the 24-hour fuse (full when new, empty at expiry).
export const LandedCard = memo(function LandedCard({ file, now, sender, opening, selected, onMenu, onShare }: Props) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setThumbUri(null);
    if (file.thumb_path) {
      void localThumbnail(file.id, file.thumb_path).then((uri) => {
        if (active) setThumbUri(uri);
      });
    }
    return () => {
      active = false;
    };
  }, [file.id, file.thumb_path]);

  const remaining = expiresAt(file) - now;
  const fuse = file.pinned ? 1 : Math.max(0, Math.min(1, remaining / FILE_LIFETIME_MS));
  const expiry = formatExpiry(file, now);
  const meta = [formatBytes(file.size), opening ? "Downloading…" : expiry.charAt(0).toLowerCase() + expiry.slice(1)].join(", ");
  const tag = file.delivered_at ? (sender ? `Landed ${sender}` : "Landed") : "Waiting for your devices";

  return (
    <View style={[styles.card, selected && styles.selected]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Newest: ${file.name}, ${meta}${sender ? `, ${sender}` : ""}`}
        accessibilityHint="Opens Preview, Share, Pin and Delete"
        onPress={(event) => onMenu(file, event.nativeEvent.pageY)}
        onLongPress={(event) => onMenu(file, event.nativeEvent.pageY)}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <View style={[styles.preview, !thumbUri && { backgroundColor: tileColor(file.mime_type, file.name, palette) }]}>
          {thumbUri ? (
            <Image source={{ uri: thumbUri }} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
          ) : (
            <Text style={styles.ext}>{extension(file.name)}</Text>
          )}
          <View style={styles.tag}>
            <View style={styles.tagDot} />
            <Text style={styles.tagText} numberOfLines={1}>
              {tag}
            </Text>
          </View>
        </View>
        <View style={styles.info}>
          <View style={styles.text}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="middle">
              {file.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          </View>
          {opening ? (
            <ActivityIndicator color={palette.text} />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Share ${file.name}`}
              onPress={() => onShare(file)}
              hitSlop={4}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <ShareIcon size={19} color={palette.text} />
            </Pressable>
          )}
        </View>
      </Pressable>
      <View style={styles.fuse} accessibilityElementsHidden importantForAccessibility="no">
        <View style={[styles.fuseFill, { width: `${Math.round(fuse * 100)}%` }]} />
      </View>
    </View>
  );
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      padding: 6,
      borderRadius: 22,
      backgroundColor: c.card,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.hairline,
    },
    selected: {
      borderColor: c.accent,
    },
    pressed: {
      opacity: 0.85,
    },
    preview: {
      height: 196,
      borderRadius: 16,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.fill,
    },
    image: {
      ...StyleSheet.absoluteFill,
    },
    ext: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.heading,
    },
    tag: {
      position: "absolute",
      top: 10,
      left: 10,
      maxWidth: "80%",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: tokens.radii.pill,
      backgroundColor: "rgba(20, 18, 14, 0.66)",
    },
    tagDot: {
      width: 7,
      height: 7,
      borderRadius: tokens.radii.pill,
      backgroundColor: c.accent,
    },
    tagText: {
      flexShrink: 1,
      color: "#FFFFFF",
      fontFamily: tokens.fonts.semibold,
      fontSize: 12,
    },
    info: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.md,
      paddingTop: 12,
      paddingBottom: 8,
      paddingHorizontal: 8,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    name: {
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: 17,
    },
    meta: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
      fontVariant: ["tabular-nums"],
    },
    action: {
      width: tokens.layout.minTouchTarget,
      height: tokens.layout.minTouchTarget,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.fill,
    },
    fuse: {
      height: 3,
      marginHorizontal: 8,
      marginBottom: 6,
      borderRadius: 2,
      overflow: "hidden",
      backgroundColor: c.fill,
    },
    fuseFill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: c.accent,
    },
  });
