import { useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { tokens } from "../design/tokens";
import { CLIP_MAX_CHARS, type ClipRow } from "../lib/clips";
import { formatSender } from "../lib/format";
import type { Density } from "../hooks/useProfileSettings";
import { useV2, type V2 } from "../design/v2";
import { ClipRowV2 } from "./ClipRowV2";
import { ClipIcon, UpIcon } from "./Icons";

type Props = {
  header?: ReactNode; // shared top (wordmark, heading, tabs); none in compact
  clips: ClipRow[];
  error: string | null;
  now: number;
  deviceId: string | null;
  deviceNames: Record<string, string>;
  onSend: (text: string) => Promise<string | null>;
  onDelete: (id: string) => void;
  onRefresh: () => Promise<void>;
  density: Density;
};

export function ClipsList({ header, clips, error, now, deviceId, deviceNames, onSend, onDelete, onRefresh }: Props) {
  const v = useV2();
  const styles = makeStyles(v);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const send = async (text: string, clearDraft: boolean) => {
    setBusy(true);
    const result = await onSend(text);
    setBusy(false);
    setMessage(result ?? "Sent to your devices.");
    if (!result && clearDraft) setDraft("");
  };

  // Paste puts the clipboard into the box (read only when tapped); Send sends it.
  const pasteIntoDraft = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      setMessage("Your clipboard is empty.");
      return;
    }
    setDraft(text.slice(0, CLIP_MAX_CHARS));
    setMessage(null);
  };

  return (
    <FlatList
      data={clips}
      keyExtractor={(clip) => clip.id}
      extraData={[now, deviceNames]}
      renderItem={({ item, index }) => (
        <ClipRowV2
          clip={item}
          now={now}
          sender={formatSender(item.device_id, deviceId, deviceNames)}
          onDelete={onDelete}
          position={clips.length === 1 ? "single" : index === 0 ? "first" : index === clips.length - 1 ? "last" : "middle"}
        />
      )}
      initialNumToRender={12}
      windowSize={7}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={v.ink}
          onRefresh={async () => {
            setRefreshing(true);
            await onRefresh();
            setRefreshing(false);
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.top}>
          {header}
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Write or paste a clip"
              placeholderTextColor={v.ink3}
              selectionColor={v.amber}
              cursorColor={v.amber}
              maxLength={CLIP_MAX_CHARS}
              multiline
              accessibilityLabel="New clip"
            />
            <View style={styles.composeRow}>
              <Pressable accessibilityRole="button" accessibilityHint="Puts what's on your clipboard in the box" onPress={() => void pasteIntoDraft()} style={({ pressed }) => [styles.tbtn, pressed && styles.pressed]}>
                <ClipIcon size={16} color={v.ink} />
                <Text style={styles.tbtnLabel}>Paste</Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || !draft.trim(), busy }}
                disabled={busy || !draft.trim()}
                onPress={() => void send(draft, true)}
                style={({ pressed }) => [styles.pbtn, (busy || !draft.trim()) && styles.disabled, pressed && styles.pressed]}
              >
                {busy ? <ActivityIndicator color={v.onAmber} /> : <UpIcon size={16} color={v.onAmber} />}
                <Text style={styles.pbtnLabel}>Send</Text>
              </Pressable>
            </View>
          </View>
          {(message ?? error) && (
            <Text accessibilityLiveRegion="polite" style={styles.note}>
              {message ?? error}
            </Text>
          )}
          {clips.length > 0 && (
            <View style={styles.glabel}>
              <Text accessibilityRole="header" style={styles.glabelText}>Recent</Text>
              <Text style={styles.glabelHint}>Tap to copy</Text>
            </View>
          )}
        </View>
      }
      ListEmptyComponent={<Text style={styles.note}>No clips yet. Send one from any device.</Text>}
    />
  );
}

const makeStyles = (v: V2) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: tokens.spacing.lg },
    top: { gap: 18, marginBottom: 8 },
    composer: { paddingTop: 14, paddingHorizontal: 14, paddingBottom: 10, borderRadius: 20, backgroundColor: v.surface, borderWidth: 1, borderColor: v.edge },
    input: { minHeight: 48, maxHeight: 160, padding: 0, color: v.ink, fontFamily: tokens.fonts.semibold, fontSize: 17, textAlignVertical: "top" },
    composeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
    tbtn: { height: 34, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: v.fill },
    tbtnLabel: { color: v.ink, fontFamily: tokens.fonts.extrabold, fontSize: 13.5 },
    pbtn: { height: 34, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, borderRadius: 10, backgroundColor: v.amber },
    pbtnLabel: { color: v.onAmber, fontFamily: tokens.fonts.extrabold, fontSize: 14 },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.75 },
    note: { color: v.ink3, fontFamily: tokens.fonts.semibold, fontSize: 13.5, paddingHorizontal: 4 },
    glabel: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, marginBottom: -10 },
    glabelText: { color: v.ink2, fontFamily: tokens.fonts.extrabold, fontSize: 14 },
    glabelHint: { color: v.ink3, fontFamily: tokens.fonts.semibold, fontSize: 14 },
  });
