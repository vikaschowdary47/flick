import { Modal, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { useWaitlist } from "../hooks/useWaitlist";
import { PAYMENTS_ENABLED } from "../lib/config";
import { formatBytes } from "../lib/format";
import { FREE_MAX_BYTES, FREE_MAX_PINS, type LimitKind } from "../lib/limits";
import { LogoMark } from "./LogoMark";
import { PillButton } from "./PillButton";

type Props = {
  limit: LimitKind | null; // null hides the screen
  email: string | null;
  onFreeUpSpace: () => void;
  onClose: () => void;
};

const COPY: Record<LimitKind, { title: string; body: string }> = {
  pins: {
    title: `You've used ${FREE_MAX_PINS} of ${FREE_MAX_PINS} pins`,
    body: "Unpin a file to pin a new one.",
  },
  storage: {
    title: `Storage full (${formatBytes(FREE_MAX_BYTES).replace(".0", "")})`,
    body: "Delete a few old files to make room for new ones.",
  },
};

export function LimitScreen({ limit, email, onFreeUpSpace, onClose }: Props) {
  const styles = useThemedStyles(makeStyles);
  const waitlist = useWaitlist(email);
  if (!limit) return null;

  const close = () => {
    waitlist.reset();
    onClose();
  };

  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <LogoMark size={tokens.layout.signInMark} />
          <Text accessibilityRole="header" style={styles.heading}>
            {COPY[limit].title}
          </Text>
          <Text style={styles.body}>{COPY[limit].body}</Text>
        </View>

        <View style={styles.actions}>
          <PillButton
            label="Free up space"
            size="large"
            onPress={() => {
              close();
              onFreeUpSpace();
            }}
          />
          {PAYMENTS_ENABLED ? (
            // Later: swap in the real upgrade flow here.
            <PillButton label="Upgrade" variant="secondary" onPress={close} />
          ) : waitlist.state === "joined" ? (
            <Text accessibilityLiveRegion="polite" style={styles.note}>
              You're on the list. We'll email you once, when Pro is ready.
            </Text>
          ) : (
            <>
              <PillButton
                label="Want more? Get notified when Pro is ready"
                variant="secondary"
                busy={waitlist.state === "saving"}
                onPress={() => void waitlist.join(limit)}
              />
              <Text style={styles.note}>
                {waitlist.state === "error"
                  ? "Couldn't save that. Check your connection and try again."
                  : "We'll email you once, when it's ready."}
              </Text>
            </>
          )}
          <PillButton label="Not now" variant="secondary" onPress={close} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      justifyContent: "space-between",
      padding: tokens.layout.screenPadding,
      backgroundColor: c.background,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: tokens.spacing.md,
    },
    heading: {
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.heading,
      textAlign: "center",
    },
    body: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.body,
      textAlign: "center",
    },
    actions: {
      gap: tokens.spacing.md,
    },
    note: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
      textAlign: "center",
    },
  });
