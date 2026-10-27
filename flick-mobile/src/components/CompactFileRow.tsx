import { memo, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "../design/tokens";
import { useV2, type V2 } from "../design/v2";
import { formatBytes, formatTimeLeft } from "../lib/format";
import { localThumbnail } from "../lib/thumbs";
import type { FileRow } from "../lib/types";
import { extension } from "./FileCard";

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

const DOCS = /^(pdf|txt|md|rtf|doc|docx|pages|odt|xls|xlsx|csv|numbers|ppt|pptx|key)$/i;
const ARCHIVES = /^(zip|rar|7z|tar|gz|tgz)$/i;
const VIDEO = /^(mov|mp4|m4v|avi|mkv|webm)$/i;

// The 44pt thumbnail: the real image when there is one, otherwise a tiny
// drawing of the file type (a page, a zip, a dark video tile).
function Thumb({ file, v }: { file: FileRow; v: V2 }) {
  const s = makeStyles(v);
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setUri(null);
    if (file.thumb_path) {
      void localThumbnail(file.id, file.thumb_path).then((next) => {
        if (active) setUri(next);
      });
    }
    return () => {
      active = false;
    };
  }, [file.id, file.thumb_path]);
  const ext = extension(file.name);
  if (uri) {
    return (
      <View style={s.th}>
        <Image source={{ uri }} style={s.thImage} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={s.thEdge} pointerEvents="none" />
      </View>
    );
  }
  if (DOCS.test(ext)) {
    return (
      <View style={[s.th, s.page]}>
        <View style={s.pageTitle} />
        {[1, 0.8, 1, 1, 0.8].map((w, i) => (
          <View key={i} style={[s.pageLine, { width: `${w * 100}%` }]} />
        ))}
        <View style={s.thEdge} pointerEvents="none" />
      </View>
    );
  }
  if (ARCHIVES.test(ext)) {
    return (
      <View style={[s.th, s.zip]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[s.zipStripe, { top: i * 8 }]} />
        ))}
        <View style={s.zipTab} />
        <View style={s.thEdge} pointerEvents="none" />
      </View>
    );
  }
  return (
    <View style={[s.th, VIDEO.test(ext) && s.video]}>
      <Text style={[s.ext, VIDEO.test(ext) && s.videoText]}>{ext}</Text>
      <View style={s.thEdge} pointerEvents="none" />
    </View>
  );
}

// Redesign v2 file row (64pt): thumbnail, name, "1.4 MB, from iPhone", and
// the hours left on the right. Tap or long-press opens the usual menu.
export const CompactFileRow = memo(function CompactFileRow({ file, now, sender, opening, selected, onMenu, position = "single" }: Props) {
  const v = useV2();
  const s = makeStyles(v);
  const meta = [formatBytes(file.size), sender].filter(Boolean).join(", ");
  const left = file.pinned ? "Pinned" : formatTimeLeft(file, now).replace(/(\d)([hm])\b/, "$1 $2").replace(/ left$/, "");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${file.name}${file.pinned ? ", pinned" : ""}, ${meta}, ${left}`}
      accessibilityHint="Opens Preview, Share, Pin and Delete"
      onPress={(event) => onMenu(file, event.nativeEvent.pageY)}
      onLongPress={(event) => onMenu(file, event.nativeEvent.pageY)}
      style={({ pressed }) => [
        s.row,
        (position === "first" || position === "single") && s.top,
        (position === "last" || position === "single") && s.bottom,
        (selected || pressed) && s.selected,
      ]}
    >
      {(position === "middle" || position === "last") && <View style={s.divider} />}
      <Thumb file={file} v={v} />
      <View style={s.body}>
        <Text style={s.name} numberOfLines={1} ellipsizeMode="middle">
          {file.name}
        </Text>
        {opening ? (
          <View style={s.bar}>
            <View style={s.barFill} />
          </View>
        ) : (
          <Text style={s.meta} numberOfLines={1} ellipsizeMode="tail">
            {meta}
          </Text>
        )}
      </View>
      {opening ? <ActivityIndicator color={v.ink} /> : <Text style={[s.end, file.pinned && s.pinned]}>{left}</Text>}
    </Pressable>
  );
});

const makeStyles = (v: V2) =>
  StyleSheet.create({
    row: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      paddingLeft: 10,
      paddingRight: 14,
      backgroundColor: v.surface,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: v.edge,
    },
    top: { borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
    bottom: { borderBottomWidth: 1, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
    divider: { position: "absolute", top: 0, left: 66, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: v.hair },
    selected: { backgroundColor: v.fill },
    th: { width: 44, height: 44, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: v.fill },
    thImage: { width: "100%", height: "100%" },
    thEdge: { ...StyleSheet.absoluteFill, borderRadius: 10, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
    page: { alignItems: "stretch", justifyContent: "flex-start", gap: 2.5, padding: 6, backgroundColor: "#FFFDF8" },
    pageTitle: { width: "60%", height: 3, borderRadius: 1, backgroundColor: "#2B2210" },
    pageLine: { height: 2, borderRadius: 1, backgroundColor: "#C9C3B6" },
    zip: { backgroundColor: "#E9E4D8" },
    zipStripe: { position: "absolute", left: 0, right: 0, height: 4, backgroundColor: "#D9D2C2" },
    zipTab: { width: 12, height: 18, borderRadius: 3, backgroundColor: "#F5B83D", borderWidth: 1.5, borderColor: "#2B2210" },
    video: { backgroundColor: "#1A1712" },
    ext: { color: v.ink2, fontFamily: tokens.fonts.extrabold, fontSize: 10, letterSpacing: 0.2 },
    videoText: { color: "#FFFFFF" },
    body: { flex: 1, minWidth: 0 },
    name: { color: v.ink, fontFamily: tokens.fonts.semibold, fontSize: 15.5, letterSpacing: -0.08 },
    meta: { color: v.ink3, fontFamily: tokens.fonts.regular, fontSize: 13, fontVariant: ["tabular-nums"] },
    bar: { height: 3, marginTop: 6, overflow: "hidden", borderRadius: 2, backgroundColor: v.fill2 },
    barFill: { width: "40%", height: "100%", borderRadius: 2, backgroundColor: v.ink },
    end: { color: v.ink3, fontFamily: tokens.fonts.regular, fontSize: 13, fontVariant: ["tabular-nums"], textAlign: "right" },
    pinned: { color: v.amberDeep, fontFamily: tokens.fonts.extrabold },
  });
