import { useEffect, useState, type ReactNode } from "react";
import { Switch } from "react-native";
import { ScrollView, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../design/ThemeProvider";
import type { AppearancePreference, ThemeName } from "../design/theme";
import { tokens } from "../design/tokens";
import { DEVICE_NAME_MAX, type WidgetMode } from "../hooks/useDevice";
import type { Density } from "../hooks/useProfileSettings";
import { cacheSize, clearCache } from "../lib/cache";
import { formatBytes } from "../lib/format";
import type { Usage } from "../lib/limits";
import { DeleteAccount } from "./DeleteAccount";
import { useV2, type V2 } from "../design/v2";
import { BellIcon, BroomIcon, ChevronIcon, ClipIcon, LockIcon, MoonIcon, TypeIcon, WidgetIcon } from "./Icons";
import { APP_NAME } from "../lib/appName";

type Props = {
  email?: string | null;
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
  onSignOut?: () => void;
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
  { value: "drop", label: "Minimal" },
  { value: "playful", label: "Playful" },
  { value: "classy", label: "Classy" },
];

export function SettingsSheet({ email, onDeleteAccount, visible, onClose, deviceName, onRenameDevice, usage, protectUris = [], showClipboardSetting, clipboardSharing, onClipboardSharingChange, density, onDensityChange, widgetMode, onWidgetModeChange, onSignOut }: Props) {
  const { appearance, setAppearance, themeName, setThemeName } = useTheme();
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

  const v = useV2();
  const st = makeV2Styles(v);
  const [editingName, setEditingName] = useState(false);
  const cycle = <T,>(list: { value: T; label: string }[], value: T): T => list[(list.findIndex((o) => o.value === value) + 1) % list.length].value;
  const labelOf = <T,>(list: { value: T; label: string }[], value: T) => list.find((o) => o.value === value)?.label ?? "";
  // Exact amount ("2.1 MB", "340 KB"): rounding to whole MB showed small photos as 0 MB.
  const used = usage ? (usage.storageUsedBytes > 0 ? formatBytes(usage.storageUsedBytes) : "0 MB") : "";
  const share = usage && usage.maxStorageMb > 0 ? Math.min(1, usage.storageUsedBytes / (usage.maxStorageMb * 1024 * 1024)) : 0;
  const who = deviceName?.split(/['’]s /)[0] || (email ? email.split("@")[0] : "You");
  const initial = (who.trim()[0] ?? "Y").toUpperCase();
  const phoneWord = Platform.OS === "ios" ? "iPhone" : "phone";
  const toggle = (on: boolean, onChange: (on: boolean) => void, label: string, disabled = false) => (
    <Switch
      accessibilityLabel={label}
      value={on}
      disabled={disabled}
      onValueChange={onChange}
      trackColor={{ true: v.toggleOn, false: v.fill2 }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={v.fill2}
    />
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined} onRequestClose={() => void close()}>
      <KeyboardAvoidingView style={[st.screen]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <SafeAreaView edges={Platform.OS === "ios" ? ["bottom"] : ["top", "bottom"]} style={st.screen}>
          <View style={st.navbar}>
            <Pressable accessibilityRole="button" onPress={() => void close()} disabled={deleting} hitSlop={10}>
              <Text style={st.done}>Done</Text>
            </Pressable>
          </View>
          <ScrollView key={visible ? "open" : "closed"} keyboardShouldPersistTaps="handled" contentContainerStyle={st.content}>
            <Text accessibilityRole="header" style={st.title}>Settings</Text>

            {/* Account and usage */}
            <View style={st.group}>
              <View style={st.acct}>
                <View style={st.avatar}><Text style={st.avatarText}>{initial}</Text></View>
                <View style={st.grow}>
                  <Text style={st.acctName} numberOfLines={1}>{email ?? who}</Text>
                  {usage && <Text style={st.acctSub}>{usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1)} plan</Text>}
                </View>
              </View>
              {usage && (
                <View style={[st.row, st.rowBlock]}>
                  <View style={st.line} />
                  <View style={st.between}>
                    <Text style={st.k}>Storage</Text>
                    <Text style={st.v}>{used} of {usage.maxStorageMb} MB</Text>
                  </View>
                  <View style={st.meter}><View style={[st.meterFill, { width: `${Math.round(share * 100)}%` }]} /></View>
                </View>
              )}
              {usage && (
                <View style={st.row}>
                  <View style={st.line} />
                  <Text style={[st.k, st.grow]}>Devices</Text>
                  <Text style={st.v}>{usage.devicesUsed} of {usage.maxDevices}</Text>
                </View>
              )}
              {usage && (
                <View style={st.row}>
                  <View style={st.line} />
                  <Text style={[st.k, st.grow]}>Pins</Text>
                  <Text style={st.v}>{usage.pinsUsed} of {usage.maxPins}</Text>
                </View>
              )}
            </View>

            {/* This phone */}
            <View>
              <Text style={st.hdr}>This {phoneWord}</Text>
              <View style={st.group}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Name, ${draft}`} onPress={() => setEditingName(true)} style={st.row}>
                  <Sq bg="#5E5A52"><TypeIcon color="#FFFFFF" /></Sq>
                  <Text style={st.k}>Name</Text>
                  {editingName ? (
                    <TextInput
                      autoFocus
                      style={st.nameInput}
                      value={draft}
                      onChangeText={setDraft}
                      onEndEditing={() => { setEditingName(false); void saveName(); }}
                      onSubmitEditing={() => { setEditingName(false); void saveName(); }}
                      maxLength={DEVICE_NAME_MAX}
                      placeholder="Name"
                      placeholderTextColor={v.ink3}
                      returnKeyType="done"
                      autoCorrect={false}
                      editable={deviceName !== null}
                      accessibilityLabel="Name"
                      accessibilityHint="Shown as “from” on files sent from this device"
                    />
                  ) : (
                    <View style={st.valueWrap}>
                      <Text style={st.v} numberOfLines={1}>{draft || "Name"}</Text>
                      <ChevronIcon color={v.ink3} />
                    </View>
                  )}
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Appearance, ${labelOf(APPEARANCES, appearance)}`} onPress={() => setAppearance(cycle(APPEARANCES, appearance))} style={st.row}>
                  <View style={st.lineIc} />
                  <Sq bg="#3D4A8A"><MoonIcon color="#FFFFFF" /></Sq>
                  <Text style={st.k}>Appearance</Text>
                  <View style={st.valueWrap}><Text style={st.v}>{labelOf(APPEARANCES, appearance)}</Text><ChevronIcon color={v.ink3} /></View>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Style, ${labelOf(THEMES, themeName)}`} onPress={() => setThemeName(cycle(THEMES, themeName))} style={st.row}>
                  <View style={st.lineIc} />
                  <Sq bg="#B57A10"><WidgetIcon color="#FFFFFF" /></Sq>
                  <Text style={st.k}>Style</Text>
                  <View style={st.valueWrap}><Text style={st.v}>{labelOf(THEMES, themeName)}</Text><ChevronIcon color={v.ink3} /></View>
                </Pressable>
              </View>
              {nameError && <Text accessibilityRole="alert" style={[st.foot, { color: v.danger }]}>{nameError}</Text>}
            </View>

            {/* Toggles */}
            <View>
              <View style={st.group}>
                {Platform.OS === "ios" && (
                  <>
                    <View style={st.row}>
                      <Sq bg="#2F7D57"><LockIcon color="#FFFFFF" /></Sq>
                      <Text style={[st.k, st.grow]}>Show names on Lock Screen</Text>
                      {toggle(widgetMode.lock_content, (on) => void onWidgetModeChange({ lock_content: on }), "Show names on Lock Screen", !widgetMode.lock)}
                    </View>
                    <View style={st.row}>
                  <View style={st.lineIc} />
                      <Sq bg="#C2384A"><BellIcon color="#FFFFFF" /></Sq>
                      <Text style={[st.k, st.grow]}>Live Activity</Text>
                      {toggle(widgetMode.live_activity, (on) => void onWidgetModeChange({ live_activity: on }), "Live Activity")}
                    </View>
                    <View style={st.row}>
                  <View style={st.lineIc} />
                      <Sq bg="#6B5BD2"><WidgetIcon color="#FFFFFF" /></Sq>
                      <Text style={[st.k, st.grow]}>Home Screen widget</Text>
                      {toggle(widgetMode.home, (on) => void onWidgetModeChange({ home: on }), "Home Screen widget")}
                    </View>
                    <View style={st.row}>
                  <View style={st.lineIc} />
                      <Sq bg="#4F7BE8"><LockIcon color="#FFFFFF" /></Sq>
                      <Text style={[st.k, st.grow]}>Lock Screen widget</Text>
                      {toggle(widgetMode.lock, (on) => void onWidgetModeChange({ lock: on }), "Lock Screen widget")}
                    </View>
                  </>
                )}
                {showClipboardSetting && (
                  <View style={st.row}>
                    {Platform.OS === "ios" && <View style={st.lineIc} />}
                    <Sq bg="#2B2210"><ClipIcon color="#FFFFFF" /></Sq>
                    <Text style={[st.k, st.grow]}>Clipboard sharing</Text>
                    {toggle(clipboardSharing, onClipboardSharingChange, "Clipboard sharing")}
                  </View>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Clear cache, ${formatBytes(cacheBytes)}`}
                  disabled={cacheBytes === 0}
                  onPress={() => {
                    clearCache(protectUris);
                    setCacheBytes(cacheSize());
                  }}
                  style={st.row}
                >
                  {(showClipboardSetting || Platform.OS === "ios") && <View style={st.lineIc} />}
                  <Sq bg="#726D64"><BroomIcon color="#FFFFFF" /></Sq>
                  <Text style={[st.k, st.grow]}>Clear cached files</Text>
                  <Text style={st.v}>{formatBytes(cacheBytes)}</Text>
                </Pressable>
              </View>
              <Text style={st.foot}>
                {APP_NAME} only reads your clipboard when you tap Paste.{Platform.OS === "ios" ? " Lock Screen shows counts until you turn on names." : ""}
              </Text>
            </View>

            {onSignOut && (
              <View style={st.group}>
                <Pressable accessibilityRole="button" onPress={onSignOut} disabled={deleting} style={({ pressed }) => [st.center, pressed && { opacity: 0.7 }]}>
                  <Text style={st.centerLabel}>Sign out</Text>
                </Pressable>
              </View>
            )}
            <DeleteAccount onDelete={onDeleteAccount} onBusyChange={setDeleting} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// iOS-style coloured icon square for settings rows.
function Sq({ bg, children }: { bg: string; children: ReactNode }) {
  return <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>{children}</View>;
}

const makeV2Styles = (v: V2) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: v.canvas },
    navbar: { height: 52, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", paddingHorizontal: 20, paddingTop: 8 },
    done: { color: v.amberDeep, fontFamily: tokens.fonts.extrabold, fontSize: 17 },
    content: { paddingHorizontal: 16, paddingBottom: 40, gap: 22 },
    title: { color: v.ink, fontFamily: tokens.fonts.extrabold, fontSize: 32, letterSpacing: -0.6, lineHeight: 36, marginHorizontal: 4, marginTop: 2 },
    group: { borderRadius: 18, backgroundColor: v.surface, borderWidth: 1, borderColor: v.edge, overflow: "hidden" },
    acct: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: v.amber, alignItems: "center", justifyContent: "center" },
    avatarText: { color: v.onAmber, fontFamily: tokens.fonts.extrabold, fontSize: 18 },
    acctName: { color: v.ink, fontFamily: tokens.fonts.extrabold, fontSize: 16 },
    acctSub: { color: v.ink3, fontFamily: tokens.fonts.regular, fontSize: 13.5, marginTop: 1 },
    row: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 8 },
    rowBlock: { flexDirection: "column", alignItems: "stretch", gap: 8, paddingVertical: 12 },
    between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    line: { position: "absolute", top: 0, left: 14, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: v.hair },
    lineIc: { position: "absolute", top: 0, left: 54, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: v.hair },
    k: { color: v.ink, fontFamily: tokens.fonts.semibold, fontSize: 16 },
    v: { color: v.ink3, fontFamily: tokens.fonts.regular, fontSize: 16, fontVariant: ["tabular-nums"] },
    valueWrap: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
    nameInput: { flex: 1, textAlign: "right", color: v.ink, fontFamily: tokens.fonts.semibold, fontSize: 16, paddingVertical: 4 },
    meter: { height: 6, borderRadius: 3, backgroundColor: v.fill2, overflow: "hidden" },
    meterFill: { height: 6, borderRadius: 3, backgroundColor: v.ink },
    hdr: { color: v.ink3, fontFamily: tokens.fonts.extrabold, fontSize: 13, marginHorizontal: 14, marginBottom: 6 },
    foot: { color: v.ink3, fontFamily: tokens.fonts.regular, fontSize: 13, lineHeight: 18, marginHorizontal: 14, marginTop: 8 },
    grow: { flex: 1 },
    center: { minHeight: 48, alignItems: "center", justifyContent: "center" },
    centerLabel: { color: v.ink, fontFamily: tokens.fonts.extrabold, fontSize: 16 },
  });

