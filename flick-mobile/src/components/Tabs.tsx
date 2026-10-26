import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";

export type HomeTab = "files" | "clips";

type Props = {
  tab: HomeTab;
  onChange: (tab: HomeTab) => void;
  clipsDot: boolean; // a new clip arrived while on Files
  slim?: boolean; // compact: 32pt tall (touch area stays 44pt)
};

// Files | Clips switch (only shown when clips are on).
export function Tabs({ tab, onChange, clipsDot, slim }: Props) {
  const styles = useThemedStyles(makeStyles);
  const item = (value: HomeTab, label: string, dot: boolean) => {
    const selected = tab === value;
    return (
      <Pressable
        key={value}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        accessibilityLabel={dot ? `${label}, new` : label}
        onPress={() => onChange(value)}
        hitSlop={slim ? (tokens.layout.minTouchTarget - tokens.compact.tabHeight) / 2 : undefined}
        style={[styles.tab, slim && styles.slim, selected && styles.selected]}
      >
        <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
        {dot && <View style={styles.dot} />}
      </Pressable>
    );
  };
  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {item("files", "Files", false)}
      {item("clips", "Clips", clipsDot && tab !== "clips")}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: 2,
      padding: 2,
      borderRadius: 10,
      backgroundColor: c.fill,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      gap: tokens.spacing.xs,
      minHeight: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
    slim: {
      minHeight: tokens.compact.tabHeight,
    },
    selected: {
      backgroundColor: c.card,
    },
    label: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta + 1,
    },
    selectedLabel: {
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
    },
    dot: {
      width: tokens.layout.statusDot - 1,
      height: tokens.layout.statusDot - 1,
      borderRadius: tokens.radii.pill,
      backgroundColor: c.accent,
    },
  });
