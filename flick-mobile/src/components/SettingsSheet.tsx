import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { AppearancePreference, Palette, ThemeName } from "../design/theme";
import { tokens } from "../design/tokens";
import { PillButton } from "./PillButton";

type Props = { visible: boolean; onClose: () => void };

const APPEARANCES: { value: AppearancePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const THEMES: { value: ThemeName; label: string }[] = [
  { value: "playful", label: "Playful" },
  { value: "classy", label: "Classy" },
];

export function SettingsSheet({ visible, onClose }: Props) {
  const { appearance, setAppearance, themeName, setThemeName } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close settings" style={styles.scrim} onPress={onClose} />
      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        <Text accessibilityRole="header" style={styles.heading}>
          Settings
        </Text>
        <Segmented label="Appearance" options={APPEARANCES} value={appearance} onChange={setAppearance} />
        <Segmented label="Theme" options={THEMES} value={themeName} onChange={setThemeName} />
        <PillButton label="Done" onPress={onClose} variant="secondary" />
      </SafeAreaView>
    </Modal>
  );
}

type SegmentedProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.group}>
      <Text style={styles.eyebrow}>{label.toUpperCase()}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.segments}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.segment, selected && styles.segmentSelected]}
            >
              <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: c.scrim,
    },
    sheet: {
      gap: tokens.spacing.lg,
      padding: tokens.layout.screenPadding,
      borderTopLeftRadius: tokens.radii.window,
      borderTopRightRadius: tokens.radii.window,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.background,
    },
    heading: {
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.heading,
    },
    group: {
      gap: tokens.spacing.sm,
    },
    eyebrow: {
      color: c.textMuted,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.eyebrow,
      letterSpacing: tokens.letterSpacing.eyebrow,
    },
    segments: {
      flexDirection: "row",
      gap: tokens.spacing.sm,
    },
    segment: {
      flex: 1,
      minHeight: tokens.layout.minTouchTarget,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.card,
    },
    segmentSelected: {
      backgroundColor: c.accent,
    },
    segmentLabel: {
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.body,
    },
    segmentLabelSelected: {
      color: c.onAccent,
    },
  });
