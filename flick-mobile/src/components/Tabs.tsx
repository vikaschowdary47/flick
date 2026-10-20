import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";

export type HomeTab = "files" | "clips";

type Props = {
  tab: HomeTab;
  onChange: (tab: HomeTab) => void;
  clipsDot: boolean; // a new clip arrived while on Files
};

// Files | Clips switch (only shown when clips are on).
export function Tabs({ tab, onChange, clipsDot }: Props) {
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
        style={[styles.tab, selected && styles.selected]}
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
      gap: tokens.spacing.sm,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      gap: tokens.spacing.xs,
      minHeight: tokens.layout.minTouchTarget,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.card,
    },
    selected: {
      backgroundColor: c.accent,
    },
    label: {
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.body,
    },
    selectedLabel: {
      color: c.onAccent,
    },
    dot: {
      width: tokens.layout.statusDot,
      height: tokens.layout.statusDot,
      borderRadius: tokens.radii.pill,
      backgroundColor: c.error,
      borderWidth: 1,
      borderColor: c.outline,
    },
  });
