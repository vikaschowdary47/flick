import { useEffect, useState } from "react";
import { Switch } from "react-native";
import { ScrollView, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { AppearancePreference, Palette, ThemeName } from "../design/theme";
import { tokens } from "../design/tokens";
import { DEVICE_NAME_MAX, type WidgetMode } from "../hooks/useDevice";
import type { Density } from "../hooks/useProfileSettings";
import { cacheSize, clearCache } from "../lib/cache";
import { formatBytes } from "../lib/format";
import type { Usage } from "../lib/limits";
import { DeleteAccount } from "./DeleteAccount";
import { PillButton } from "./PillButton";
import { APP_NAME } from "../lib/appName";

type Props = {
  visible: boolean;
  onDeleteAccount: () => Promise<string | null>;
  onClose: () => void;
  deviceName: string | null;
  onRenameDevice: (name: string) => Promise<string | null>;
  usage: Usage | null;
  protectUris?: string[]; // a file open right now survives Clear cache
  showClipboardSetting: boolean; // the clipboard feature flag
  clipboardSharing: boolean;
  onClipboardSharingChange: (on: boolean) => void;
  density: Density;
  onDensityChange: (density: Density) => void;
  widgetMode: WidgetMode;
  onWidgetModeChange: (changes: Partial<WidgetMode>) => Promise<string | null>;
};

const APPEARANCES: { value: AppearancePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const DENSITIES: { value: Density; label: string }[] = [
  { value: "comfy", label: "Comfy" },
  { value: "compact", label: "Compact" },
];

const THEMES: { value: ThemeName; label: string }[] = [
  { value: "playful", label: "Playful" },
  { value: "classy", label: "Classy" },
];

export function SettingsSheet({ onDeleteAccount, visible, onClose, deviceName, onRenameDevice, usage, protectUris = [], showClipboardSetting, clipboardSharing, onClipboardSharingChange, density, onDensityChange, widgetMode, onWidgetModeChange }: Props) {
  const { appearance, setAppearance, themeName, setThemeName } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { palette } = useTheme();
  const [draft, setDraft] = useState(deviceName ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [cacheBytes, setCacheBytes] = useState(0);
  const [deleting, setDeleting] = useState(false);

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
    if (deleting) return;
    if (await saveName()) onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => void close()}>
      <Pressable accessibilityLabel="Close settings" style={styles.scrim} onPress={() => void close()} />
      <KeyboardAvoidingView style={{ maxHeight: "90%" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        <ScrollView key={visible ? "open" : "closed"} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
        <Text accessibilityRole="header" style={styles.heading}>
          Settings
        </Text>
        <Segmented label="Appearance" options={APPEARANCES} value={appearance} onChange={setAppearance} />
        <Segmented label="Theme" options={THEMES} value={themeName} onChange={setThemeName} />
        <Segmented label="Density" options={DENSITIES} value={density} onChange={onDensityChange} />
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
        {Platform.OS === "ios" && (
          // Saved for this device only (devices.widget_mode). iOS doesn't let
          // apps remove a placed widget, so "off" makes it say so instead.
          <View style={styles.group}>
            <Text style={styles.eyebrow}>WIDGETS ON THIS IPHONE</Text>
            {(
              [
                ["home", "Home Screen widget", null],
                ["lock", "Lock Screen widget", null],
                ["lock_content", "Show content on Lock Screen", "Off: only counts, since the Lock Screen is visible without unlocking."],
                ["live_activity", "Live Activity for new files", null],
              ] as const
            ).map(([key, label, help]) => (
              <View key={key} style={styles.cacheRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cacheText}>{label}</Text>
                  {help && <Text style={styles.nameError}>{help}</Text>}
                </View>
                <Switch
                  accessibilityLabel={label}
                  value={widgetMode[key]}
                  disabled={key === "lock_content" && !widgetMode.lock}
                  onValueChange={(on) => void onWidgetModeChange({ [key]: on })}
                  trackColor={{ true: palette.accent, false: palette.fallbackTile }}
                />
              </View>
            ))}
          </View>
        )}
        {showClipboardSetting && (
          <View style={styles.group}>
            <Text style={styles.eyebrow}>CLIPBOARD SHARING</Text>
            <View style={styles.cacheRow}>
              <Text style={styles.cacheText}>
                Share text and links between your devices. {APP_NAME} only reads your clipboard when you tap Send
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
        <DeleteAccount onDelete={onDeleteAccount} onBusyChange={setDeleting} />
        <PillButton label="Done" onPress={() => void close()} disabled={deleting} variant="secondary" />
        </ScrollView>
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
    sheetContent: { gap: tokens.spacing.lg, padding: tokens.layout.screenPadding },
    sheet: {
      flexShrink: 1,
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
