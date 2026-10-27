import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "../design/tokens";
import { useV2, type V2 } from "../design/v2";
import { PasteIcon, PhotoIcon, UpIcon } from "./Icons";

type Props = {
  onSend: () => void; // opens "What are you sending?"
  onPhotos: () => void; // straight to the photo picker
  onPaste?: () => void; // only when clips are on
  busy: boolean; // an upload is running
};

// Redesign v2: one round amber send button in the thumb zone, with Photos and
// Paste beside it. Amber means "this sends something" and is used nowhere else.
export function SendDock({ onSend, onPhotos, onPaste, busy }: Props) {
  const v = useV2();
  const styles = makeStyles(v);
  return (
    <View style={styles.row}>
      <Side label="Photos" hint="Pick photos and videos to send" onPress={onPhotos} disabled={busy}>
        <PhotoIcon size={22} color={v.ink} />
      </Side>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send a file"
        accessibilityHint="Choose photos, a file, or take a photo to send to all your devices"
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={onSend}
        style={styles.ring}
      >
        {({ pressed }) => (
          <View style={[styles.send, pressed && styles.sendPressed]}>
            {busy ? <ActivityIndicator color={v.onAmber} /> : <UpIcon size={28} color={v.onAmber} />}
          </View>
        )}
      </Pressable>
      {onPaste ? (
        <Side label="Paste" hint="Sends what's on your clipboard as a clip" onPress={onPaste}>
          <PasteIcon size={22} color={v.ink} />
        </Side>
      ) : (
        <View style={styles.sideSpacer} />
      )}
    </View>
  );
}

function Side({
  label,
  hint,
  onPress,
  disabled,
  children,
}: {
  label: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const styles = makeStyles(useV2());
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.side, (pressed || disabled) && styles.sidePressed]}
    >
      <View style={styles.sideCircle}>{children}</View>
      <Text style={styles.sideLabel}>{label}</Text>
    </Pressable>
  );
}

const SEND = 70;

const makeStyles = (v: V2) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18 },
    ring: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: v.ink, alignItems: "center", justifyContent: "center" },
    send: { width: SEND, height: SEND, borderRadius: SEND / 2, backgroundColor: v.amber, alignItems: "center", justifyContent: "center" },
    sendPressed: { transform: [{ scale: 0.94 }] },
    side: { width: 64, alignItems: "center", gap: 6 },
    sidePressed: { opacity: 0.6 },
    sideCircle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: v.surface, borderWidth: 1, borderColor: v.edge },
    sideLabel: { color: v.ink2, fontFamily: tokens.fonts.extrabold, fontSize: 12 },
    sideSpacer: { width: 64 },
  });
