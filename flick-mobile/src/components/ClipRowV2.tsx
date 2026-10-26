import { memo, useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { tokens } from "../design/tokens";
import { useV2, type V2 } from "../design/v2";
import { siteName, type ClipRow } from "../lib/clips";
import type { GroupPosition } from "./CompactFileRow";
import { CopyIcon } from "./Icons";

const COPIED_MS = 1500;
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });
const BADGES: Record<string, { text: string; bg: string }> = {
  github: { text: "GH", bg: "#24292F" },
  gitlab: { text: "GL", bg: "#6B4FBB" },
  figma: { text: "Fi", bg: "#1E1E1E" },
  youtube: { text: "YT", bg: "#C4302B" },
  notion: { text: "N", bg: "#191919" },
  google: { text: "G", bg: "#1A73E8" },
};

export function looksLikeCode(text: string): boolean {
  return /^\s*(\$ |npm |npx |git |cd |rm |sudo |yarn |pnpm |brew |curl |docker |ssh )|&&|=>|[{};]\s*$/.test(text);
}

export function agoLong(iso: string, now: number): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return hours < 48 ? "yesterday" : `${Math.floor(hours / 24)} days ago`;
}

type Props = {
  clip: ClipRow;
  sender: string; // "from …" or empty
  now: number;
  onDelete: (id: string) => void;
  position: GroupPosition;
};

// Redesign v2 clip row: a badge ($_ for code, the site for links, Aa for
// text), the clip, who sent it and when, and Copy. Tap copies; long-press
// offers Delete.
export const ClipRowV2 = memo(function ClipRowV2({ clip, sender, now, onDelete, position }: Props) {
  const v = useV2();
  const s = makeStyles(v);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const isLink = clip.kind === "link";
  const code = !isLink && looksLikeCode(clip.content);
  const site = isLink ? siteName(clip.content) : "";
  const root = site.split(".").slice(-2, -1)[0]?.toLowerCase() ?? "";
  const path = isLink ? clip.content.replace(/^https?:\/\/[^/]+/i, "").replace(/[?#].*$/, "").replace(/^\/+|\/+$/g, "") : "";
  const badge = isLink ? BADGES[root] ?? { text: (root.charAt(0) || "↗").toUpperCase(), bg: "#5E5A52" } : null;
  const meta = [site, sender, agoLong(clip.created_at, now)].filter(Boolean).join(", ");
  const copy = async () => {
    await Clipboard.setStringAsync(clip.content);
    setCopied(true);
  };
  const confirmDelete = () =>
    Alert.alert("Delete this clip?", "It's removed from all your devices.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(clip.id) },
    ]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isLink ? `Link, ${path || site}` : clip.content}. ${meta}`}
      accessibilityHint="Copies it. Long-press to delete."
      onPress={() => void copy()}
      onLongPress={confirmDelete}
      style={({ pressed }) => [
        s.row,
        code || (!isLink && clip.content.length > 40) ? s.tall : null,
        (position === "first" || position === "single") && s.top,
        (position === "last" || position === "single") && s.bottom,
        pressed && s.pressed,
      ]}
    >
      {(position === "middle" || position === "last") && <View style={s.divider} />}
      {badge ? (
        <View style={[s.fav, { backgroundColor: badge.bg }]}>
          <Text style={s.favLight}>{badge.text}</Text>
        </View>
      ) : code ? (
        <View style={[s.fav, s.favCode]}>
          <Text style={[s.favDark, { fontFamily: MONO, fontSize: 14 }]}>$_</Text>
        </View>
      ) : (
        <View style={[s.fav, s.favText]}>
          <Text style={[s.favDark, { color: "#2B2210" }]}>Aa</Text>
        </View>
      )}
      <View style={s.body}>
        {code ? (
          <Text style={s.codeWrap}>
            <Text style={s.code}>{clip.content}</Text>
          </Text>
        ) : (
          <Text style={[s.name, !isLink && s.wrap]} numberOfLines={isLink ? 1 : 4}>
            {isLink ? (path ? decodeURIComponent(path) : site) : clip.content}
          </Text>
        )}
        <Text style={s.meta} numberOfLines={1}>
          {copied ? "Copied" : meta}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Copy" onPress={() => void copy()} hitSlop={4} style={({ pressed }) => [s.act, pressed && s.pressed]}>
        <CopyIcon size={19} color={v.ink} />
      </Pressable>
    </Pressable>
  );
});

const makeStyles = (v: V2) =>
  StyleSheet.create({
    row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 10, paddingRight: 14, backgroundColor: v.surface, borderLeftWidth: 1, borderRightWidth: 1, borderColor: v.edge },
    tall: { alignItems: "flex-start", paddingVertical: 12 },
    top: { borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
    bottom: { borderBottomWidth: 1, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
    divider: { position: "absolute", top: 0, left: 66, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: v.hair },
    pressed: { opacity: 0.7 },
    fav: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    favCode: { backgroundColor: v.fill2 },
    favText: { backgroundColor: "#E9E4D8" },
    favLight: { color: "#FFFFFF", fontFamily: tokens.fonts.extrabold, fontSize: 16 },
    favDark: { color: v.ink, fontFamily: tokens.fonts.extrabold, fontSize: 16 },
    body: { flex: 1, minWidth: 0 },
    name: { color: v.ink, fontFamily: tokens.fonts.semibold, fontSize: 15.5, letterSpacing: -0.08 },
    wrap: { lineHeight: 22 },
    codeWrap: { lineHeight: 23 },
    code: { color: v.ink, fontFamily: MONO, fontSize: 12.5, backgroundColor: v.fill },
    meta: { marginTop: 1, color: v.ink3, fontFamily: tokens.fonts.regular, fontSize: 13 },
    act: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: v.fill },
  });
