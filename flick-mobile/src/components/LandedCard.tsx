import { memo, useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "../design/tokens";
import { useV2, type V2 } from "../design/v2";
import { FILE_LIFETIME_MS, expiresAt, formatBytes, formatExpiry } from "../lib/format";
import { canShowFullImage, localFullImage, localThumbnail } from "../lib/thumbs";
import type { FileRow } from "../lib/types";
import { extension } from "./FileCard";
import { EyeIcon, ShareUpIcon } from "./Icons";

type Props = {
  file: FileRow;
  now: number;
  sender: string; // "from …" or empty
  opening: boolean;
  selected: boolean;
  onMenu: (file: FileRow, pageY: number) => void;
  onShare: (file: FileRow) => void;
  onPreview?: (file: FileRow) => void;
};

// "23h" → "23 h": the mockup's spacing.
export function spaced(text: string): string {
  return text.replace(/(\d)([hm])\b/g, "$1 $2");
}

// Redesign v2: the newest file "lands" as a real preview at the top of Files.
// Tapping it opens the usual menu; Preview and Share are one tap away.
// The amber line is the 24-hour fuse (full when new, empty at expiry).
export const LandedCard = memo(function LandedCard({ file, now, sender, opening, selected, onMenu, onShare, onPreview }: Props) {
  const v = useV2();
  const s = makeStyles(v);
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  // The thumbnail shows at once; the full photo replaces it when it's in, so
  // the big preview is sharp.
  const [fullUri, setFullUri] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setThumbUri(null);
    setFullUri(null);
    if (file.thumb_path) {
      void localThumbnail(file.id, file.thumb_path).then((uri) => {
        if (active) setThumbUri(uri);
      });
    }
    if (canShowFullImage(file.mime_type, file.size, Platform.OS)) {
      void localFullImage(file.id, file.storage_path).then((uri) => {
        if (active && uri) setFullUri(uri);
      });
    }
    return () => {
      active = false;
    };
  }, [file.id, file.thumb_path, file.storage_path, file.mime_type, file.size]);

  const remaining = expiresAt(file) - now;
  const fuse = file.pinned ? 1 : Math.max(0, Math.min(1, remaining / FILE_LIFETIME_MS));
  const expiry = spaced(formatExpiry(file, now));
  const meta = [formatBytes(file.size), opening ? "downloading…" : expiry.charAt(0).toLowerCase() + expiry.slice(1)].join(", ");
  const tag = file.delivered_at ? `Just landed${sender ? ` ${sender}` : ""}` : "Waiting for your devices";

  return (
    <View style={[s.card, selected && s.selected]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Newest: ${file.name}, ${meta}${sender ? `, ${sender}` : ""}`}
        accessibilityHint="Opens Preview, Share, Pin and Delete"
        onPress={(event) => onMenu(file, event.nativeEvent.pageY)}
        onLongPress={(event) => onMenu(file, event.nativeEvent.pageY)}
        style={({ pressed }) => [s.preview, pressed && s.pressed]}
      >
        {fullUri || thumbUri ? (
          <Image source={{ uri: (fullUri ?? thumbUri) as string }} style={s.image} resizeMode="cover" accessibilityIgnoresInvertColors />
        ) : (
          <Text style={s.ext}>{extension(file.name)}</Text>
        )}
        <View style={s.previewEdge} pointerEvents="none" />
        <View style={s.tag}>
          <View style={s.tagDot} />
          <Text style={s.tagText} numberOfLines={1}>
            {tag}
          </Text>
        </View>
      </Pressable>
      <View style={s.info}>
        <View style={s.text}>
          <Text style={s.name} numberOfLines={1} ellipsizeMode="middle">
            {file.name}
          </Text>
          <Text style={s.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        {opening ? (
          <ActivityIndicator color={v.ink} />
        ) : (
          <>
            {onPreview && (
              <Pressable accessibilityRole="button" accessibilityLabel={`Preview ${file.name}`} onPress={() => onPreview(file)} hitSlop={4} style={({ pressed }) => [s.act, pressed && s.pressed]}>
                <EyeIcon size={19} color={v.ink} />
              </Pressable>
            )}
            <Pressable accessibilityRole="button" accessibilityLabel={`Share ${file.name}`} onPress={() => onShare(file)} hitSlop={4} style={({ pressed }) => [s.act, pressed && s.pressed]}>
              <ShareUpIcon size={19} color={v.ink} />
            </Pressable>
          </>
        )}
      </View>
      <View style={s.fuse} accessibilityElementsHidden importantForAccessibility="no">
        <View style={[s.fuseFill, { width: `${Math.round(fuse * 100)}%` }]} />
      </View>
    </View>
  );
});

const makeStyles = (v: V2) =>
  StyleSheet.create({
    card: { padding: 6, borderRadius: 24, backgroundColor: v.surface, borderWidth: 1, borderColor: v.edge },
    selected: { borderColor: v.amber },
    pressed: { opacity: 0.85 },
    preview: { height: 212, borderRadius: 18, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: v.fill },
    previewEdge: { ...StyleSheet.absoluteFill, borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
    image: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
    ext: { color: v.ink2, fontFamily: tokens.fonts.extrabold, fontSize: 22 },
    tag: { position: "absolute", top: 10, left: 10, maxWidth: "80%", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingLeft: 8, paddingRight: 10, borderRadius: 999, backgroundColor: v.tagBg },
    tagDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: v.amber },
    tagText: { color: "#FFFFFF", fontFamily: tokens.fonts.extrabold, fontSize: 12 },
    info: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 12, paddingRight: 8, paddingBottom: 8, paddingLeft: 10 },
    text: { flex: 1, minWidth: 0 },
    name: { color: v.ink, fontFamily: tokens.fonts.extrabold, fontSize: 17, letterSpacing: -0.17 },
    meta: { marginTop: 1, color: v.ink2, fontFamily: tokens.fonts.regular, fontSize: 13.5, fontVariant: ["tabular-nums"] },
    act: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: v.fill },
    fuse: { height: 3, marginTop: 2, marginHorizontal: 10, marginBottom: 8, overflow: "hidden", borderRadius: 2, backgroundColor: v.fill2 },
    fuseFill: { height: "100%", borderRadius: 2, backgroundColor: v.amber },
  });
