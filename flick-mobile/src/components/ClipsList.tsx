import { useState, type ReactNode } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { CLIP_MAX_CHARS, type ClipRow } from "../lib/clips";
import { formatSender } from "../lib/format";
import type { Density } from "../hooks/useProfileSettings";
import { ClipCard } from "./ClipCard";
import { ClipChip } from "./ClipChip";
import { PillButton } from "./PillButton";

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

export function ClipsList({ header, clips, error, now, deviceId, deviceNames, onSend, onDelete, onRefresh, density }: Props) {
  const compact = density === "compact";
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
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

  // The clipboard is read only here, when the button is tapped.
  const sendClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      setMessage("Your clipboard is empty.");
      return;
    }
    await send(text, false);
  };

  return (
    <FlatList
      data={clips}
      keyExtractor={(clip) => clip.id}
      extraData={[now, deviceNames]}
      renderItem={({ item }) =>
        compact ? (
          <ClipChip
            clip={item}
            now={now}
            sender={formatSender(item.device_id, deviceId, deviceNames)}
            onDelete={onDelete}
          />
        ) : (
        <ClipCard
          clip={item}
          now={now}
          sender={formatSender(item.device_id, deviceId, deviceNames)}
          onDelete={() => onDelete(item.id)}
        />
        )
      }
      // Fixed chip height lets the list skip measuring rows.
      getItemLayout={
        compact
          ? (_data, index) => ({
              length: tokens.compact.chipHeight + tokens.compact.gap,
              offset: (tokens.compact.chipHeight + tokens.compact.gap) * index,
              index,
            })
          : undefined
      }
      initialNumToRender={12}
      windowSize={7}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={compact ? CompactSeparator : Separator}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={palette.text}
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
          <PillButton
            label="Send clipboard"
            onPress={() => void sendClipboard()}
            busy={busy}
            accessibilityHint="Reads your clipboard now and sends it to your devices"
          />
          <View style={styles.composeRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a clip"
              placeholderTextColor={palette.textMuted}
              maxLength={CLIP_MAX_CHARS}
              multiline
              accessibilityLabel="Type a clip"
            />
            <PillButton
              label="Send"
              variant="secondary"
              onPress={() => void send(draft, true)}
              disabled={busy || !draft.trim()}
            />
          </View>
          {(message ?? error) && (
            <Text accessibilityLiveRegion="polite" style={styles.note}>
              {message ?? error}
            </Text>
          )}
          <Text accessibilityRole="header" style={styles.eyebrow}>
            Recent clips
          </Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.note}>No clips yet. Send one from any device.</Text>}
    />
  );
}

function Separator() {
  return <View style={{ height: tokens.layout.cardGap }} />;
}

function CompactSeparator() {
  return <View style={{ height: tokens.compact.gap }} />;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: tokens.layout.screenPadding,
      paddingTop: tokens.spacing.sm,
      paddingBottom: tokens.spacing.lg,
    },
    top: {
      gap: tokens.spacing.lg,
      marginBottom: tokens.spacing.md,
    },
    composeRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: tokens.spacing.sm,
    },
    input: {
      flex: 1,
      minHeight: tokens.layout.inputHeight,
      maxHeight: tokens.layout.inputHeight * 3,
      paddingHorizontal: tokens.spacing.lg,
      paddingTop: tokens.spacing.md,
      paddingBottom: tokens.spacing.md,
      borderRadius: tokens.radii.card,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.card,
      color: c.text,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.body,
    },
    note: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
    },
    eyebrow: {
      marginTop: tokens.spacing.sm,
      color: c.textMuted,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.eyebrow,
      letterSpacing: tokens.letterSpacing.eyebrow,
    },
    separator: {
      height: tokens.layout.cardGap,
    },
  });
