import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
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
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Side label="Photos" hint="Pick photos and videos to send" onPress={onPhotos} disabled={busy}>
        <PhotoIcon size={22} color={palette.text} />
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
            {busy ? <ActivityIndicator color={palette.onAccent} /> : <UpIcon size={28} color={palette.onAccent} />}
          </View>
        )}
      </Pressable>
      {onPaste ? (
        <Side label="Paste" hint="Sends what's on your clipboard as a clip" onPress={onPaste}>
          <PasteIcon size={22} color={palette.text} />
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
  const styles = useThemedStyles(makeStyles);
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

const SEND = tokens.layout.sendButton;

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: tokens.spacing.md,
    },
    ring: {
      width: SEND + 12,
      height: SEND + 12,
      borderRadius: tokens.radii.pill,
      borderWidth: 2.5,
      borderColor: c.text,
      alignItems: "center",
      justifyContent: "center",
    },
    send: {
      width: SEND,
      height: SEND,
      borderRadius: tokens.radii.pill,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    sendPressed: {
      transform: [{ scale: 0.94 }],
    },
    side: {
      width: 64,
      alignItems: "center",
      gap: 6,
    },
    sidePressed: {
      opacity: 0.6,
    },
    sideCircle: {
      width: 52,
      height: 52,
      borderRadius: tokens.radii.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.card,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.hairline,
    },
    sideLabel: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: 12,
    },
    sideSpacer: {
      width: 64,
    },
  });
