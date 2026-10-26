import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { PillButton } from "./PillButton";
export function DeleteAccount({ onDelete, onBusyChange }: { onDelete: () => Promise<string | null>; onBusyChange: (busy: boolean) => void }) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!confirming) return <PillButton label="Delete account" variant="secondary" onPress={() => setConfirming(true)} />;
  return <View style={styles.group}>
    <Text accessibilityRole="header" style={styles.heading}>Delete your account permanently?</Text>
    <Text style={styles.text}>This removes your account, files, clips, devices and profile. This cannot be undone. Type DELETE to confirm.</Text>
    {error && <Text accessibilityRole="alert" style={styles.text}>{error}</Text>}
    <TextInput style={styles.input} accessibilityLabel="Type DELETE to confirm account deletion" value={confirmation} onChangeText={setConfirmation}
      autoCapitalize="characters" autoCorrect={false} editable={!busy} placeholder="DELETE" placeholderTextColor={palette.textMuted} />
    <PillButton label="Permanently delete account" busy={busy} disabled={confirmation !== "DELETE"} onPress={() => {
      setBusy(true); onBusyChange(true); setError(null);
      void onDelete().then(setError).catch(() => setError("Couldn't delete your account. Try again.")).finally(() => { setBusy(false); onBusyChange(false); });
    }} />
    <PillButton label="Cancel" variant="secondary" disabled={busy} onPress={() => { setConfirming(false); setConfirmation(""); setError(null); }} />
  </View>;
}
const makeStyles = (c: Palette) => StyleSheet.create({
  group: { gap: 12 },
  heading: { color: c.text, fontFamily: tokens.fonts.extrabold, fontSize: tokens.fontSizes.body },
  text: { color: c.text, fontFamily: tokens.fonts.semibold, fontSize: tokens.fontSizes.meta },
  input: { minHeight: tokens.layout.inputHeight, borderWidth: tokens.borderWidth.outline, borderRadius: 12,
    borderColor: c.hairline, backgroundColor: c.card, color: c.text, paddingHorizontal: 16, fontFamily: tokens.fonts.semibold },
});
