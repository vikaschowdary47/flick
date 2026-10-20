import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import type { DeviceRow } from "../hooks/useDevice";
import { useWaitlist } from "../hooks/useWaitlist";
import { PAYMENTS_ENABLED } from "../lib/config";
import type { LimitKind, Usage } from "../lib/limits";
import { LogoMark } from "./LogoMark";
import { PillButton } from "./PillButton";

type Props = {
  limit: LimitKind | null; // null hides the screen
  usage: Usage | null; // limits from the server; may still be loading
  email: string | null;
  devices: DeviceRow[];
  thisDeviceId: string | null;
  onRemoveDevice: (id: string) => Promise<string | null>;
  onFreeUpSpace: () => void;
  onClose: () => void;
};

const PLATFORM_LABELS: Record<string, string> = {
  ios: "iPhone",
  android: "Android",
  macos: "Mac",
  windows: "Windows",
  linux: "Linux",
  web: "Web",
};

function lastActive(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 2) return "Active now";
  if (minutes < 60) return `Active ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `Active ${hours}h ago`;
  return `Active ${Math.round(hours / 24)}d ago`;
}

function copy(limit: LimitKind, usage: Usage | null): { title: string; body: string } {
  if (limit === "pins") {
    const max = usage?.maxPins;
    return {
      title: max !== undefined ? `You've used ${max} of ${max} pins` : "All your pins are used",
      body: "Unpin a file to pin a new one.",
    };
  }
  if (limit === "storage") {
    return {
      title: usage ? `Storage full (${usage.maxStorageMb} MB)` : "Storage full",
      body: "Delete a few old files to make room for new ones.",
    };
  }
  const max = usage?.maxDevices;
  return {
    title: max !== undefined ? `You're signed in on ${max} of ${max} devices` : "Too many devices",
    body: "Remove a device you don't use to sign in here.",
  };
}

// Shared limit screen for pins, storage and devices. The secondary action is
// the Pro waitlist while PAYMENTS_ENABLED is false; flipping it swaps in an
// upgrade button (no payment code exists yet).
export function LimitScreen({
  limit,
  usage,
  email,
  devices,
  thisDeviceId,
  onRemoveDevice,
  onFreeUpSpace,
  onClose,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const waitlist = useWaitlist(email);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  if (!limit) return null;

  const close = () => {
    waitlist.reset();
    setRemoveError(null);
    onClose();
  };
  const { title, body } = copy(limit, usage);

  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.center}>
            <LogoMark size={tokens.layout.signInMark} />
            <Text accessibilityRole="header" style={styles.heading}>
              {title}
            </Text>
            <Text style={styles.body}>{body}</Text>
          </View>

          {limit === "devices" && (
            <View style={styles.devices}>
              <Text style={styles.eyebrow}>REMOVE A DEVICE</Text>
              {devices.map((device) => {
                const isThis = device.id === thisDeviceId;
                return (
                  <View key={device.id} style={styles.deviceCard}>
                    <View style={styles.deviceText}>
                      <Text style={styles.deviceName} numberOfLines={1}>
                        {device.name}
                      </Text>
                      <Text style={styles.deviceMeta} numberOfLines={1}>
                        {PLATFORM_LABELS[device.platform] ?? "Device"} · {isThis ? "This device" : lastActive(device.last_seen_at)}
                      </Text>
                    </View>
                    {!isThis && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${device.name}`}
                        accessibilityHint="Signs that device out of Flick"
                        disabled={removingId !== null}
                        onPress={async () => {
                          setRemovingId(device.id);
                          setRemoveError(await onRemoveDevice(device.id));
                          setRemovingId(null);
                        }}
                        style={[styles.removeButton, removingId === device.id && styles.busy]}
                      >
                        <Text style={styles.removeLabel}>{removingId === device.id ? "Removing…" : "Remove"}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
              {removeError && (
                <Text accessibilityRole="alert" style={styles.note}>
                  {removeError}
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.actions}>
          {limit !== "devices" && (
            <PillButton
              label="Free up space"
              size="large"
              onPress={() => {
                close();
                onFreeUpSpace();
              }}
            />
          )}
          {PAYMENTS_ENABLED ? (
            // Later: the real upgrade flow goes here.
            <PillButton label="Upgrade" variant="secondary" onPress={close} />
          ) : waitlist.state === "joined" ? (
            <Text accessibilityLiveRegion="polite" style={styles.note}>
              We'll email you once, when Pro launches.
            </Text>
          ) : (
            <PillButton
              label="Want more? Get notified when Pro is ready"
              variant="secondary"
              busy={waitlist.state === "saving"}
              onPress={() => void waitlist.join(limit)}
            />
          )}
          {!PAYMENTS_ENABLED && (
            <Text style={styles.note}>
              {waitlist.state === "error"
                ? "Couldn't save that. Check your connection and try again."
                : "One email, no spam. Reply “unsubscribe” to it and we'll take you off the list."}
            </Text>
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
      padding: tokens.layout.screenPadding,
      backgroundColor: c.background,
    },
    scroll: {
      flexGrow: 1,
      gap: tokens.spacing.lg,
    },
    center: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: tokens.spacing.md,
      paddingVertical: tokens.spacing.xl,
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
    devices: {
      gap: tokens.spacing.md,
    },
    eyebrow: {
      color: c.textMuted,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.eyebrow,
      letterSpacing: tokens.letterSpacing.eyebrow,
    },
    deviceCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.md,
      padding: tokens.spacing.md,
      borderRadius: tokens.radii.card,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.card,
      ...tokens.shadows.sticker,
      shadowColor: c.shadow,
    },
    deviceText: {
      flex: 1,
      gap: tokens.spacing.xs,
    },
    deviceName: {
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.cardTitle,
    },
    deviceMeta: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
    },
    removeButton: {
      minHeight: tokens.layout.minTouchTarget,
      justifyContent: "center",
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.dangerFill,
    },
    removeLabel: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.meta,
    },
    busy: {
      opacity: 0.6,
    },
    actions: {
      gap: tokens.spacing.md,
      paddingTop: tokens.spacing.md,
    },
    note: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
      textAlign: "center",
    },
  });
