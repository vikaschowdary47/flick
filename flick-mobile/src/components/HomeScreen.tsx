import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { useClips } from "../hooks/useClips";
import { useProfileSettings } from "../hooks/useProfileSettings";
import { useConnectionStatus } from "../hooks/useConnectionStatus";
import { useDevice } from "../hooks/useDevice";
import { useUsage } from "../hooks/useUsage";
import { useNow } from "../hooks/useNow";
import { useOpenFile } from "../hooks/useOpenFile";
import { usePinFile } from "../hooks/usePinFile";
import { useRecentFiles } from "../hooks/useRecentFiles";
import { useRemoveFile } from "../hooks/useRemoveFile";
import { useUpload } from "../hooks/useUpload";
import { pruneCache } from "../lib/cache";
import { formatExpiry, formatSender } from "../lib/format";
import type { FileRow } from "../lib/types";
import { FileCard, PinBadge } from "./FileCard";
import { ClipsList } from "./ClipsList";
import { FileMenu, type FileMenuItem } from "./FileMenu";
import { FileViewer } from "./FileViewer";
import { Header } from "./Header";
import { LimitScreen } from "./LimitScreen";
import { EyeIcon, PinIcon, ShareIcon, TrashIcon } from "./Icons";
import { PillButton } from "./PillButton";
import { SettingsSheet } from "./SettingsSheet";
import { SourceSheet } from "./SourceSheet";
import { Tabs, type HomeTab } from "./Tabs";
import { UploadCard } from "./UploadCard";

type Props = {
  userId: string;
  email: string | null;
  onSignOut: () => void;
};

export function HomeScreen({ userId, email, onSignOut }: Props) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const recent = useRecentFiles(userId);
  const device = useDevice(userId, onSignOut);
  const connection = useConnectionStatus({
    realtimeStatus: recent.realtimeStatus,
    onReconnect: recent.reconnect,
  });
  const { state: upload, pickAndUpload, reset, limitHit: uploadLimit, clearLimit } = useUpload(recent.refresh, device.deviceId);
  const listRef = useRef<FlatList<FileRow>>(null);
  const opener = useOpenFile();
  const now = useNow();
  const remover = useRemoveFile(recent.refresh);
  const pinner = usePinFile(recent.refresh);
  // The card whose menu is open, and where it was touched.
  const [menu, setMenu] = useState<{ file: FileRow; anchorY: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  // Clips: hidden, not fetched and not subscribed unless the clipboard
  // feature flag and the user's Clipboard sharing setting are both on.
  const profile = useProfileSettings(userId);
  const clipsOn = profile.clipsActive;
  const clips = useClips(userId, device.deviceId, clipsOn);
  const [tab, setTab] = useState<HomeTab>("files");
  const activeTab: HomeTab = clipsOn ? tab : "files";
  const changeTab = (next: HomeTab) => {
    setTab(next);
    if (next === "clips") clips.clearNew();
  };
  const tabs = clipsOn ? <Tabs tab={activeTab} onChange={changeTab} clipsDot={clips.hasNew} /> : null;

  const activeLimit = uploadLimit ?? pinner.limitHit ?? (device.limitHit ? "devices" : null);
  // Limits and usage come from the server; refresh when they're about to show.
  const usage = useUsage(settingsOpen || activeLimit !== null);

  // Drop cached copies of files that expired or were deleted (on any device),
  // copies unused for 24 hours, and the oldest ones past 150 MB.
  const viewerUri = opener.viewer?.folder.uri;
  useEffect(() => {
    if (recent.loading || recent.error) return;
    pruneCache({
      liveFileIds: new Set(recent.files.map((file) => file.id)),
      protectUris: viewerUri ? [viewerUri] : [],
    });
  }, [recent.files, recent.loading, recent.error, viewerUri]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await recent.refresh();
    setRefreshing(false);
  }, [recent.refresh]);

  const visibleFiles = useMemo(
    () => recent.files.filter((file) => !remover.isHidden(file.id)),
    [recent.files, remover.isHidden],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FileRow; index: number }) => {
      const opening = opener.openingId === item.id;
      const open = menu?.file.id === item.id;
      const showMenu = (pageY: number) => {
        if (!opening) setMenu({ file: item, anchorY: pageY });
      };
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens Preview, Share, Pin and Delete"
          onPress={(event) => showMenu(event.nativeEvent.pageY)}
          onLongPress={(event) => showMenu(event.nativeEvent.pageY)}
          style={[index % 2 === 0 ? styles.tiltLeft : styles.tiltRight, open && styles.selectedCard]}
        >
          <FileCard
            name={item.name}
            size={item.size}
            mimeType={item.mime_type}
            tone={opening ? "sending" : "plain"}
            badge={item.pinned ? <PinBadge /> : undefined}
            singleLineMeta
            status={
              opening
                ? "Downloading…"
                : [
                    formatSender(item.device_id, device.deviceId, device.names),
                    item.delivered_at ? "Landed" : "Waiting for your devices",
                    formatExpiry(item.created_at, now),
                  ]
                    .filter(Boolean)
                    .join(" · ")
            }
          />
        </Pressable>
      );
    },
    [menu, now, opener.openingId, styles, device.deviceId, device.names],
  );

  const menuItems: FileMenuItem[] = menu
    ? [
        {
          key: "preview",
          label: "Preview",
          icon: <EyeIcon />,
          fill: "preview",
          onPress: () => opener.open(menu.file),
        },
        {
          key: "share",
          label: "Share",
          icon: <ShareIcon />,
          fill: "share",
          onPress: () => opener.share(menu.file),
        },
        {
          key: "pin",
          label: menu.file.pinned ? "Unpin" : "Pin",
          icon: <PinIcon />,
          fill: "pin",
          onPress: () => void pinner.togglePin(menu.file),
        },
        {
          key: "delete",
          label: "Delete",
          icon: <TrashIcon />,
          fill: "danger",
          // Same as before: 5-second Undo, then gone from every device.
          onPress: () => remover.remove(menu.file),
        },
      ]
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      {activeTab === "clips" ? (
        <ClipsList
          header={
            <>
              <Header status={connection.status} />
              <Text accessibilityRole="header" style={styles.heading}>
                Flick it to all your devices
              </Text>
              {tabs}
            </>
          }
          clips={clips.clips}
          error={clips.error}
          now={now}
          deviceId={device.deviceId}
          deviceNames={device.names}
          onSend={clips.send}
          onDelete={(id) => void clips.remove(id)}
          onRefresh={clips.refresh}
          density={profile.density}
        />
      ) : (
      <FlatList
        ref={listRef}
        data={visibleFiles}
        extraData={[menu, now, device.names]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.text} />
        }
        ListHeaderComponent={
          <View style={styles.top}>
            <Header status={connection.status} />
            <Text accessibilityRole="header" style={styles.heading}>
              Flick it to all your devices
            </Text>
            {tabs}
            <UploadCard state={upload} onDismiss={reset} />
            <Text accessibilityRole="header" style={styles.eyebrow}>
              RECENTLY SENT
            </Text>
            {(remover.error ?? pinner.error ?? opener.error) && (
              <Text accessibilityRole="alert" style={styles.openError}>
                {remover.error ?? pinner.error ?? opener.error}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {recent.loading ? "Loading…" : recent.error ?? "Nothing yet. Flick something over!"}
          </Text>
        }
      />
      )}

      <View style={styles.thumbZone}>
        {remover.pending && (
          <View accessibilityLiveRegion="polite" style={styles.undoBar}>
            <Text style={styles.undoText} numberOfLines={1} ellipsizeMode="middle">
              Removed {remover.pending.name}
            </Text>
            <Pressable accessibilityRole="button" onPress={remover.undo} style={styles.undoButton}>
              <Text style={styles.undoLabel}>Undo</Text>
            </Pressable>
          </View>
        )}
        <PillButton
          label="Flick it"
          size="large"
          onPress={() => setSourceOpen(true)}
          busy={upload.kind === "uploading"}
          accessibilityHint="Choose photos, a file, or take a photo to send to all your devices"
        />
        <View style={styles.footerLinks}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSettingsOpen(true)}
            style={styles.signOut}
            hitSlop={tokens.spacing.sm}
          >
            <Text style={styles.signOutLabel}>Settings</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onSignOut}
            style={styles.signOut}
            hitSlop={tokens.spacing.sm}
          >
            <Text style={styles.signOutLabel}>Sign out</Text>
          </Pressable>
        </View>
      </View>
      <FileMenu
        title={menu?.file.name ?? null}
        anchorY={menu?.anchorY ?? 0}
        items={menuItems}
        onClose={() => setMenu(null)}
      />
      <LimitScreen
        limit={activeLimit}
        usage={usage.usage}
        email={email}
        devices={device.devices}
        thisDeviceId={device.deviceId}
        onRemoveDevice={device.removeDevice}
        // Back to their files, so they can delete or unpin old ones.
        onFreeUpSpace={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
        onClose={() => {
          clearLimit();
          pinner.clearLimit();
          device.clearLimit();
        }}
      />
      <FileViewer
        viewer={opener.viewer}
        onClose={opener.closeViewer}
        onShare={() => void opener.shareFromViewer()}
        onFailed={opener.viewerFailed}
      />
      <SourceSheet
        visible={sourceOpen}
        onPick={(source) => void pickAndUpload(source)}
        onClose={() => setSourceOpen(false)}
      />
      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        deviceName={device.name}
        onRenameDevice={device.rename}
        usage={usage.usage}
        protectUris={viewerUri ? [viewerUri] : []}
        showClipboardSetting={profile.showClipboardSetting}
        clipboardSharing={profile.clipboardSharing}
        onClipboardSharingChange={profile.setClipboardSharing}
        density={profile.density}
        onDensityChange={profile.setDensity}
      />
    </SafeAreaView>
  );
}

function Separator() {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.separator} />;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      paddingHorizontal: tokens.layout.screenPadding,
      paddingTop: tokens.spacing.sm,
      paddingBottom: tokens.spacing.lg,
    },
    top: {
      gap: tokens.spacing.lg,
      marginBottom: tokens.spacing.md,
    },
    heading: {
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.heading,
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
    tiltLeft: {
      transform: [{ rotate: `${tokens.motion.cardTiltMinDeg / 2}deg` }],
    },
    tiltRight: {
      transform: [{ rotate: `${tokens.motion.cardTiltMaxDeg / 2}deg` }],
    },
    selectedCard: {
      transform: [{ rotate: "0deg" }, { translateY: -tokens.spacing.xs }],
    },
    undoBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.sm,
      paddingLeft: tokens.spacing.lg,
      paddingRight: tokens.spacing.xs,
      marginBottom: tokens.spacing.sm,
      borderRadius: tokens.radii.pill,
      backgroundColor: c.inverse,
    },
    undoText: {
      flex: 1,
      color: c.onInverse,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
    },
    undoButton: {
      minHeight: tokens.layout.minTouchTarget,
      paddingHorizontal: tokens.spacing.md,
      justifyContent: "center",
    },
    undoLabel: {
      color: c.inverseAccent,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.body,
    },
    openError: {
      color: c.text,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
    },
    empty: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.body,
    },
    thumbZone: {
      paddingHorizontal: tokens.layout.screenPadding,
      paddingTop: tokens.spacing.sm,
      paddingBottom: tokens.spacing.sm,
      gap: tokens.spacing.xs,
    },
    footerLinks: {
      flexDirection: "row",
      justifyContent: "center",
      gap: tokens.spacing.xl,
    },
    signOut: {
      minHeight: tokens.layout.minTouchTarget,
      alignItems: "center",
      justifyContent: "center",
    },
    signOutLabel: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
    },
  });
