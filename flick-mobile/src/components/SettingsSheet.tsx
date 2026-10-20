import { useEffect, useState } from "react";
import { Switch } from "react-native";
import { CLIPBOARD_ENABLED } from "../lib/config";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { AppearancePreference, Palette, ThemeName } from "../design/theme";
import { tokens } from "../design/tokens";
import { DEVICE_NAME_MAX } from "../hooks/useDevice";
import { cacheSize, clearCache } from "../lib/cache";
import { formatBytes } from "../lib/format";
import type { Usage } from "../lib/limits";
import { PillButton } from "./PillButton";

type Props = {
  visible: boolean;
  onClose: () => void;
  deviceName: string | null;
  onRenameDevice: (name: string) => Promise<string | null>;
  usage: Usage | null;
  protectUris?: string[]; // a file open right now survives Clear cache
  clipboardSharing: boolean;
  onClipboardSharingChange: (on: boolean) => void;
};

const APPEARANCES: { value: AppearancePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const THEMES: { value: ThemeName; label: string }[] = [
  { value: "playful", label: "Playful" },
  { value: "classy", label: "Classy" },
];

export function SettingsSheet({ visible, onClose, deviceName, onRenameDevice, usage, protectUris = [], clipboardSharing, onClipboardSharingChange }: Props) {
  const { appearance, setAppearance, themeName, setThemeName } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { palette } = useTheme();
  const [draft, setDraft] = useState(deviceName ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [cacheBytes, setCacheBytes] = useState(0);

  useEffect(() => {
    if (visible) setCacheBytes(cacheSize());
  }, [visible]);

  // Show the current name each time the sheet opens (or once it loads).
  useEffect(() => {
    if (visible) {
      setDraft(deviceName ?? "");
      setNameError(null);
    }
  }, [visible, deviceName]);

  async function saveName(): Promise<boolean> {
    if (draft.trim() === (deviceName ?? "")) return true;
    const error = await onRenameDevice(draft);
    setNameError(error);
    return error === null;
  }

  // Stay open if the name couldn't be saved, so the message is seen.
  async function close() {
    if (await saveName()) onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => void close()}>
      <Pressable accessibilityLabel="Close settings" style={styles.scrim} onPress={() => void close()} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        <Text accessibilityRole="header" style={styles.heading}>
          Settings
        </Text>
        <Segmented label="Appearance" options={APPEARANCES} value={appearance} onChange={setAppearance} />
        <Segmented label="Theme" options={THEMES} value={themeName} onChange={setThemeName} />
        <View style={styles.group}>
          <Text style={styles.eyebrow}>THIS DEVICE</Text>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            onEndEditing={() => void saveName()}
            onSubmitEditing={() => void saveName()}
            maxLength={DEVICE_NAME_MAX}
            placeholder="Name"
            placeholderTextColor={palette.textMuted}
            returnKeyType="done"
            autoCorrect={false}
            editable={deviceName !== null}
            accessibilityLabel="Name"
            accessibilityHint="Shown as “from” on files sent from this device"
          />
          {nameError && (
            <Text accessibilityRole="alert" style={styles.nameError}>
              {nameError}
            </Text>
          )}
        </View>
        <View style={styles.group}>
          <Text style={styles.eyebrow}>STORAGE</Text>
          {usage && (
            <Text style={styles.cacheText}>
              {usage.pinsUsed} of {usage.maxPins} pins, {Math.round(usage.storageUsedBytes / (1024 * 1024))} of{" "}
              {usage.maxStorageMb} MB, {usage.devicesUsed} of {usage.maxDevices} devices
            </Text>
          )}
          <View style={styles.cacheRow}>
            <Text style={styles.cacheText}>
              Cached files: {formatBytes(cacheBytes)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Clear cache, ${formatBytes(cacheBytes)}`}
              disabled={cacheBytes === 0}
              onPress={() => {
                clearCache(protectUris);
                setCacheBytes(cacheSize());
              }}
              style={[styles.segment, styles.cacheButton, cacheBytes === 0 && styles.disabled]}
            >
              <Text style={styles.segmentLabel}>Clear cache</Text>
            </Pressable>
          </View>
        </View>
        {CLIPBOARD_ENABLED && (
          <View style={styles.group}>
            <Text style={styles.eyebrow}>CLIPBOARD SHARING</Text>
            <View style={styles.cacheRow}>
              <Text style={styles.cacheText}>
                Share text and links between your devices. Flick only reads your clipboard when you tap Send
                clipboard.
              </Text>
              <Switch
                accessibilityLabel="Clipboard sharing"
                value={clipboardSharing}
                onValueChange={onClipboardSharingChange}
                trackColor={{ true: palette.accent, false: palette.fallbackTile }}
              />
            </View>
          </View>
        )}
        <PillButton label="Done" onPress={() => void close()} variant="secondary" />
      </SafeAreaView>
      </KeyboardAvoidingView>
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
    input: {
      minHeight: tokens.layout.inputHeight,
      paddingHorizontal: tokens.spacing.lg,
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.card,
      color: c.text,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.body,
    },
    nameError: {
      color: c.text,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
    },
    cacheRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.md,
    },
    cacheText: {
      flex: 1,
      color: c.text,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.body,
    },
    cacheButton: {
      flex: 0,
      paddingHorizontal: tokens.spacing.lg,
    },
    disabled: {
      opacity: 0.5,
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
