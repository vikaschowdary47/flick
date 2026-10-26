import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "../design/tokens";
import { useV2, type V2 } from "../design/v2";

export type HomeTab = "files" | "clips";

type Props = {
  tab: HomeTab;
  onChange: (tab: HomeTab) => void;
  clipsDot: boolean; // a new clip arrived while on Files
  slim?: boolean; // kept for callers; v2 is always 32pt (touch area stays 44pt)
  fileCount?: number;
  clipCount?: number;
};

// Redesign v2 segmented control: Files 5 | Clips 3.
export function Tabs({ tab, onChange, clipsDot, fileCount, clipCount }: Props) {
  const v = useV2();
  const s = makeStyles(v);
  const item = (value: HomeTab, label: string, count: number | undefined, dot: boolean) => {
    const selected = tab === value;
    return (
      <Pressable
        key={value}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label}${count !== undefined ? `, ${count}` : ""}${dot ? ", new" : ""}`}
        onPress={() => onChange(value)}
        hitSlop={6}
        style={[s.tab, selected && s.selected]}
      >
        <Text style={[s.label, selected && s.selectedLabel]}>{label}</Text>
        {count !== undefined && <Text style={s.count}>{count}</Text>}
        {dot && <View style={s.dot} />}
      </Pressable>
    );
  };
  return (
    <View accessibilityRole="tablist" style={s.row}>
      {item("files", "Files", fileCount, false)}
      {item("clips", "Clips", clipCount, clipsDot && tab !== "clips")}
    </View>
  );
}

const makeStyles = (v: V2) =>
  StyleSheet.create({
    row: { flexDirection: "row", padding: 2, borderRadius: 10, backgroundColor: v.fill },
    tab: { flex: 1, height: 32, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderRadius: 8 },
    selected: { backgroundColor: v.segOn, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(0,0,0,0.06)" },
    label: { color: v.ink2, fontFamily: tokens.fonts.extrabold, fontSize: 14 },
    selectedLabel: { color: v.ink },
    count: { color: v.ink3, fontFamily: tokens.fonts.extrabold, fontSize: 14, fontVariant: ["tabular-nums"] },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: v.amber },
  });
