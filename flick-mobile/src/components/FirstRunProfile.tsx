import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import type { AccountType } from "../hooks/useOnboarding";
import { PillButton } from "./PillButton";
import { APP_NAME } from "../lib/appName";

type Props = { initialName: string; initialType: AccountType; loading: boolean; error: string;
  onRetry: () => void; onSave: (name: string, type: AccountType) => Promise<string | null>; onSignOut: () => void };
export function FirstRunProfile({ initialName, initialType, loading, error, onRetry, onSave, onSignOut }: Props) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState(initialName);
  const [edited, setEdited] = useState(false);
  const [type, setType] = useState<AccountType>(initialType);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  useEffect(() => { if (!edited) setName(initialName); }, [initialName, edited]);
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.heading}>Make {APP_NAME} yours</Text>
      <Text style={styles.text}>Choose your name and how you'll use {APP_NAME}.</Text>
      {loading ? <ActivityIndicator color={palette.text} /> : error ? <>
        <Text accessibilityRole="alert" style={styles.text}>{error}</Text><PillButton label="Retry" onPress={onRetry} />
      </> : <>
        {saveError && <Text accessibilityRole="alert" style={styles.text}>{saveError}</Text>}
        <Text style={styles.text}>Display name</Text>
        <TextInput style={styles.input} accessibilityLabel="Display name" value={name} maxLength={80} autoComplete="name" editable={!busy}
          onChangeText={(value) => { setEdited(true); setName(value); }} />
        <View accessibilityRole="radiogroup" accessibilityLabel="Account type" style={styles.row}>
          {(["personal", "business"] as const).map((value) => <Pressable key={value} accessibilityRole="radio"
            accessibilityState={{ selected: value === type, disabled: busy }} disabled={busy} onPress={() => setType(value)}
            style={[styles.option, value === type && { backgroundColor: palette.accent }]}>
            <Text style={[styles.text, value === type && { color: palette.onAccent }]}>{value === "personal" ? "Personal" : "Business"}</Text>
          </Pressable>)}
        </View>
        <PillButton label="Continue" busy={busy} onPress={() => {
          setBusy(true); setSaveError("");
          void onSave(name, type).then((message) => setSaveError(message ?? "")).finally(() => setBusy(false));
        }} />
      </>}
      <PillButton label="Sign out" variant="secondary" onPress={onSignOut} disabled={busy} />
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
const makeStyles = (c: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { flexGrow: 1, justifyContent: "center", padding: tokens.layout.screenPadding, gap: 12 },
  heading: { color: c.text, fontFamily: tokens.fonts.extrabold, fontSize: tokens.fontSizes.heading },
  text: { color: c.text, fontFamily: tokens.fonts.semibold, fontSize: tokens.fontSizes.body },
  input: { minHeight: tokens.layout.inputHeight, borderWidth: tokens.borderWidth.outline, borderColor: c.outline,
    borderRadius: tokens.radii.pill, paddingHorizontal: 16, color: c.text, backgroundColor: c.card, fontFamily: tokens.fonts.semibold },
  row: { flexDirection: "row", gap: 8 },
  option: { flex: 1, minHeight: tokens.layout.minTouchTarget, alignItems: "center", justifyContent: "center",
    borderWidth: tokens.borderWidth.outline, borderColor: c.outline, borderRadius: tokens.radii.pill, backgroundColor: c.card },
});
