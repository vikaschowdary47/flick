import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { tokens } from "../design/tokens";
import { useV2, type V2 } from "../design/v2";

// Settings row "Delete account…", then an inline confirmation (type DELETE).
export function DeleteAccount({ onDelete, onBusyChange }: { onDelete: () => Promise<string | null>; onBusyChange: (busy: boolean) => void }) {
  const v = useV2();
  const s = makeStyles(v);
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!confirming) {
    return (
      <View style={s.group}>
        <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={({ pressed }) => [s.center, pressed && s.pressed]}>
          <Text style={s.danger}>Delete account…</Text>
        </Pressable>
      </View>
    );
  }
  const ready = confirmation === "DELETE" && !busy;
  return (
    <View style={[s.group, s.box]}>
      <Text accessibilityRole="header" style={s.heading}>Delete your account permanently?</Text>
      <Text style={s.text}>This removes your account, files, clips, devices and profile. It can't be undone. Type DELETE to confirm.</Text>
      {error && <Text accessibilityRole="alert" style={[s.text, { color: v.danger }]}>{error}</Text>}
      <TextInput
        style={s.input}
        accessibilityLabel="Type DELETE to confirm account deletion"
        value={confirmation}
        onChangeText={setConfirmation}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!busy}
        placeholder="DELETE"
        placeholderTextColor={v.ink3}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !ready, busy }}
        disabled={!ready}
        onPress={() => {
          setBusy(true); onBusyChange(true); setError(null);
          void onDelete().then(setError).catch(() => setError("Couldn't delete your account. Try again.")).finally(() => { setBusy(false); onBusyChange(false); });
        }}
        style={({ pressed }) => [s.big, { backgroundColor: v.danger }, !ready && s.disabled, pressed && s.pressed]}
      >
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.bigLabel}>Permanently delete account</Text>}
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setConfirming(false); setConfirmation(""); setError(null); }} style={({ pressed }) => [s.cancel, pressed && s.pressed]}>
        <Text style={s.cancelLabel}>Cancel</Text>
      </Pressable>
    </View>
  );
}
const makeStyles = (v: V2) => StyleSheet.create({
  group: { borderRadius: 18, backgroundColor: v.surface, borderWidth: 1, borderColor: v.edge, overflow: "hidden" },
  box: { gap: 12, padding: 14 },
  center: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  danger: { color: v.danger, fontFamily: tokens.fonts.extrabold, fontSize: 16 },
  heading: { color: v.ink, fontFamily: tokens.fonts.extrabold, fontSize: 16 },
  text: { color: v.ink2, fontFamily: tokens.fonts.regular, fontSize: 14, lineHeight: 20 },
  input: { minHeight: 48, borderRadius: 12, backgroundColor: v.fill, color: v.ink, paddingHorizontal: 14, fontFamily: tokens.fonts.semibold, fontSize: 16 },
  big: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bigLabel: { color: "#FFFFFF", fontFamily: tokens.fonts.extrabold, fontSize: 16 },
  cancel: { minHeight: 40, alignItems: "center", justifyContent: "center" },
  cancelLabel: { color: v.ink, fontFamily: tokens.fonts.extrabold, fontSize: 15 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
