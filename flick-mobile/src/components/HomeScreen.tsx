import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { useClips } from "../hooks/useClips";
import { useProfileSettings } from "../hooks/useProfileSettings";
import { useConnectionStatus } from "../hooks/useConnectionStatus";
import { useDevice } from "../hooks/useDevice";
import { useUsage } from "../hooks/useUsage";
import { useWidgetSnapshot } from "../hooks/useWidgetSnapshot";
import { useLiveActivity } from "../hooks/useLiveActivity";
import { useShareSession } from "../hooks/useShareSession";
import { useShareLinks } from "../hooks/useShareLinks";
import { useDeepLinkTarget } from "../hooks/useDeepLinkTarget";
import { useIncomingShare } from "../hooks/useIncomingShare";
import { supabase } from "../lib/supabase";
import { CLIP_MAX_CHARS, clipKind } from "../lib/clips";
import * as Clipboard from "expo-clipboard";
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
import { CompactFilesList, type CompactFilesListHandle } from "./CompactFilesList";
import { FileMenu, type FileMenuItem } from "./FileMenu";
import { FileViewer } from "./FileViewer";
import { Header } from "./Header";
import { LimitScreen } from "./LimitScreen";
import { AppMark, DownloadIcon, EyeIcon, GearIcon, PinIcon, ShareIcon, SignOutIcon, TrashIcon } from "./Icons";
import { useV2, type V2 } from "../design/v2";
import { LandedCard } from "./LandedCard";
import { SendDock } from "./SendDock";
import { SettingsSheet } from "./SettingsSheet";
import { SourceSheet } from "./SourceSheet";
import { Tabs, type HomeTab } from "./Tabs";
import { StorageNudge } from "./StorageNudge";
import { UploadCard } from "./UploadCard";

type Props = {
  userId: string;
  email: string | null;
  onSignOut: () => void;
  onDeleteAccount: () => Promise<string | null>;
};

// How recent the newest file must be to show as the large "landed" card.
const LANDED_WINDOW_MS = 2 * 60 * 60 * 1000;
// A device counts as online if it checked in within this window.
const ONLINE_WINDOW_MS = 15 * 60 * 1000;

function requestIdle(callback: () => void): void {
  const idle = (globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: () => void) => number;
  }).requestIdleCallback;
  if (idle) {
    idle(callback);
  } else {
    setTimeout(callback, 250);
  }
}

export function HomeScreen({ userId, email, onSignOut, onDeleteAccount }: Props) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const recent = useRecentFiles(userId);
  const device = useDevice(userId, onSignOut);
  const connection = useConnectionStatus({
    realtimeStatus: recent.realtimeStatus,
    onReconnect: recent.reconnect,
  });
  const { state: upload, pickAndUpload, uploadShared, reset, limitHit: uploadLimit, clearLimit } = useUpload(recent.refresh, device.deviceId);
  // Android "Share → eqlShare": files upload like picked files; text/links become a clip.
  useIncomingShare(Boolean(device.deviceId), (files) => void uploadShared(files), (text) => {
    void supabase.from("clips").insert({
      user_id: userId,
      device_id: device.deviceId,
      kind: clipKind(text),
      content: text.slice(0, CLIP_MAX_CHARS),
    });
  });
  const listRef = useRef<FlatList<FileRow>>(null);
  // Short notes under the dock: paste results, "Saved to Download".
  const [dockNote, setDockNote] = useState<string | null>(null);
  const opener = useOpenFile(setDockNote);
  const now = useNow();
  const remover = useRemoveFile(recent.refresh);
  const pinner = usePinFile(recent.refresh);
  const shareLinks = useShareLinks(userId);
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
  // Redesign v2 has one layout (the old Comfy cards are retired).
  const compact = true;
  // Home/Lock Screen widgets (development build only), switched per device
  // in Settings (devices.widget_mode).
  const widgetSenderOf = useCallback(
    (fromDevice: string | null) => formatSender(fromDevice, device.deviceId, device.names),
    [device.deviceId, device.names],
  );
  useWidgetSnapshot({
    files: recent.files,
    clips: clips.clips,
    senderOf: widgetSenderOf,
    homeEnabled: device.widgetMode.home,
    lockEnabled: device.widgetMode.lock,
    showContentOnLockScreen: device.widgetMode.lock_content,
  });
  // "eqlShare it" share extension: keep its copy of the session current.
  useShareSession(device.deviceId);
  useLiveActivity({
    files: recent.files,
    thisDeviceId: device.deviceId,
    deviceNames: device.names,
    enabled: device.widgetMode.live_activity,
  });

  // Widget taps: flick://file/<id> opens that file's menu on the Files tab;
  // flick://clip/<id> opens the Clips tab.
  const deepLink = useDeepLinkTarget();
  useEffect(() => {
    const target = deepLink.target;
    if (!target) return;
    if (target.kind === "clip") {
      if (!clipsOn) {
        deepLink.consume();
        return;
      }
      changeTab("clips");
      if (target.copy) {
        // From the widget: copy that clip (the widget's own Copy button
        // can't always reach the clipboard).
        const clip = clips.clips.find((c) => c.id === target.id);
        if (!clip) return; // wait for clips to load
        void Clipboard.setStringAsync(clip.content);
      }
      deepLink.consume();
      return;
    }
    const file = recent.files.find((f) => f.id === target.id);
    if (!file) return; // wait for the list to load (or it has expired)
    setTab("files");
    setMenu({ file, anchorY: tokens.layout.minTouchTarget * 4 });
    deepLink.consume();
  }, [deepLink.target, recent.files, clipsOn, clips.clips]);

  const tabs = clipsOn ? (
    <Tabs tab={activeTab} onChange={changeTab} clipsDot={clips.hasNew} slim={compact} fileCount={recent.files.filter((file) => !remover.isHidden(file.id)).length} clipCount={clips.clips.length} />
  ) : null;
  // Your other devices for the header: laptop or phone, and how many were seen lately.
  const otherDevices = device.devices.filter((row) => row.id !== device.deviceId);
  const deviceKinds = otherDevices.map((row) => (/^(ios|android)$/i.test(row.platform) ? "phone" : "laptop") as "phone" | "laptop");
  const onlineCount = otherDevices.filter((row) => now - new Date(row.last_seen_at).getTime() < ONLINE_WINDOW_MS).length;
  // Compact: Settings / Sign out live in a ⋯ menu in the header.
  const [accountMenuY, setAccountMenuY] = useState<number | null>(null);
  // Scroll position of the compact list (kept for the list's native driver).
  const scrollY = useRef(new Animated.Value(0)).current;
  const compactTopBar = compact ? (
    <View style={styles.compactTop}>
      <Header status={connection.status} devices={deviceKinds} online={onlineCount} onMenu={() => setSettingsOpen(true)} />
      {tabs}
    </View>
  ) : null;

  const activeLimit = shareLinks.limitHit ?? uploadLimit ?? pinner.limitHit ?? (device.limitHit ? "devices" : null);
  // Limits and usage come from the server; refresh when they're about to show.
  // Always loaded (cheap) and refreshed as files change, for the 80% prompt.
  const totalBytes = recent.files.reduce((sum, file) => sum + file.size, 0);
  const usage = useUsage(true, totalBytes);

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
  // Redesign v2: the newest file from the last couple of hours "lands" as a
  // large card above the list (and isn't repeated in it).
  const landed = useMemo(() => {
    const newest = visibleFiles[0];
    if (!newest || newest.pinned) return null;
    return now - new Date(newest.created_at).getTime() < LANDED_WINDOW_MS ? newest : null;
  }, [visibleFiles, now]);
  const listFiles = useMemo(
    () => (landed ? visibleFiles.filter((file) => file.id !== landed.id) : visibleFiles),
    [visibleFiles, landed],
  );

  // Dock "Paste": the clipboard is read only when tapped, then sent as a clip.
  useEffect(() => {
    if (!dockNote) return;
    const timer = setTimeout(() => setDockNote(null), 3500);
    return () => clearTimeout(timer);
  }, [dockNote]);
  const pasteClip = useCallback(async () => {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      setDockNote("Your clipboard is empty.");
      return;
    }
    const error = await clips.send(text);
    setDockNote(error ?? "Sent to your devices.");
    if (!error) changeTab("clips");
  }, [clips.send]);

  // Compact rows/tiles: tap or long-press opens the same menu as the cards.
  const openingId = opener.openingId;
  const openMenu = useCallback(
    (file: FileRow, pageY: number) => {
      if (openingId !== file.id) setMenu({ file, anchorY: pageY });
    },
    [openingId],
  );
  const senderOf = useCallback(
    (file: FileRow) => formatSender(file.device_id, device.deviceId, device.names),
    [device.deviceId, device.names],
  );
  const compactListRef = useRef<CompactFilesListHandle>(null);

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
                    formatExpiry(item, now),
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
          key: "save",
          label: "Save to phone",
          icon: <DownloadIcon />,
          fill: "share",
          onPress: () => opener.save(menu.file),
        },
        {
          key: "share",
          label: "Share",
          icon: <ShareIcon />,
          fill: "share",
          onPress: () => opener.share(menu.file),
        },
        {
          key: "share-link",
          label: "Share link",
          icon: <ShareIcon />,
          fill: "share",
          onPress: () => void shareLinks.create(menu.file),
        },
        ...(shareLinks.hasShareLink(menu.file)
          ? [{
              key: "revoke-share",
              label: "Revoke link",
              icon: <TrashIcon />,
              fill: "danger" as const,
              onPress: () => void shareLinks.revoke(menu.file),
            }]
          : []),
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

  const openError = shareLinks.status || remover.error || pinner.error || opener.error;
  const filesHeader = compact ? (
    <View style={styles.compactHeader}>
      <UploadCard state={upload} onDismiss={reset} />
      {landed && (
        <LandedCard
          file={landed}
          now={now}
          sender={senderOf(landed)}
          opening={opener.openingId === landed.id}
          selected={menu?.file.id === landed.id}
          onMenu={openMenu}
          onShare={(file) => opener.share(file)}
          onSave={(file) => opener.save(file)}
          onPreview={(file) => opener.open(file)}
        />
      )}
      <StorageNudge usage={usage.usage} files={recent.files} onRemove={remover.removeNow} />
      {openError && (
        <Text accessibilityRole="alert" style={styles.openError}>
          {openError}
        </Text>
      )}
    </View>
  ) : (
    <View style={styles.top}>
      <Header status={connection.status} />
      {tabs}
      <UploadCard state={upload} onDismiss={reset} />
      {landed && (
        <LandedCard
          file={landed}
          now={now}
          sender={senderOf(landed)}
          opening={opener.openingId === landed.id}
          selected={menu?.file.id === landed.id}
          onMenu={openMenu}
          onShare={(file) => opener.share(file)}
        />
      )}
      <StorageNudge usage={usage.usage} files={recent.files} onRemove={remover.removeNow} />
      <Text accessibilityRole="header" style={styles.eyebrow}>
        Recent
      </Text>
      {openError && (
        <Text accessibilityRole="alert" style={styles.openError}>
          {openError}
        </Text>
      )}
    </View>
  );
  const filesEmpty =
    recent.loading || recent.error || landed ? (
      <Text style={styles.empty}>{recent.loading ? "Loading…" : recent.error ?? "Nothing else today."}</Text>
    ) : (
      <EmptyFiles />
    );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      {compactTopBar}
      {activeTab === "clips" ? (
        <ClipsList
          header={
            compact ? undefined : (
              <>
                <Header status={connection.status} />
                {tabs}
              </>
            )
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
      ) : profile.density === "compact" ? (
        <CompactFilesList
          ref={compactListRef}
          files={listFiles}
          header={filesHeader}
          empty={filesEmpty}
          now={now}
          senderOf={senderOf}
          openingId={opener.openingId}
          selectedId={menu?.file.id ?? null}
          onMenu={openMenu}
          refreshing={refreshing}
          onRefresh={onRefresh}
          scrollY={scrollY}
        />
      ) : (
      <FlatList
        ref={listRef}
        data={listFiles}
        extraData={[menu, now, device.names]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.text} />
        }
        ListHeaderComponent={filesHeader}
        ListEmptyComponent={filesEmpty}
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
        {dockNote && (
          <Text accessibilityLiveRegion="polite" style={styles.dockNote}>
            {dockNote}
          </Text>
        )}
        <SendDock
          onSend={() => setSourceOpen(true)}
          onPhotos={() => void pickAndUpload("photos")}
          onPaste={clipsOn ? () => void pasteClip() : undefined}
          busy={upload.kind === "uploading"}
        />
        {!compact && email && (
          <Text style={styles.signedInAs} numberOfLines={1} ellipsizeMode="middle">
            Signed in as {email}
          </Text>
        )}
        {!compact && (
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
        )}
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
        onFreeUpSpace={() => {
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
          compactListRef.current?.scrollToTop();
        }}
        onClose={() => {
          clearLimit();
          shareLinks.clearLimit();
          pinner.clearLimit();
          device.clearLimit();
        }}
      />
      <FileMenu
        title={accountMenuY === null ? null : email ? `Signed in as ${email}` : "Account"}
        anchorY={accountMenuY ?? 0}
        items={[
          { key: "settings", label: "Settings", icon: <GearIcon />, fill: "preview", // iOS can't present a modal while the menu's modal is closing.
            onPress: () => requestIdle(() => setSettingsOpen(true)) },
          { key: "signout", label: "Sign out", icon: <SignOutIcon />, fill: "danger", onPress: onSignOut },
        ]}
        onClose={() => setAccountMenuY(null)}
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
        email={email}
        onDeleteAccount={onDeleteAccount}
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
        widgetMode={device.widgetMode}
        onWidgetModeChange={device.setWidgetMode}
        onSignOut={() => {
          setSettingsOpen(false);
          onSignOut();
        }}
      />
    </SafeAreaView>
  );
}

// First run / nothing today (v2): a quiet drop zone and the three ways to send.
export function EmptyFiles() {
  const v = useV2();
  const s = emptyStyles(v);
  const ways = [
    ["Tap the amber button", "Pick a file or photo"],
    ["Share from any app", "Share, then eqlShare"],
    ["Paste text or a link", "It becomes a clip"],
  ];
  return (
    <View style={s.wrap}>
      <Text accessibilityRole="header" style={s.today}>Today</Text>
      <View style={s.dz} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <AppMark size={44} />
      </View>
      <Text style={s.title}>Nothing has landed yet</Text>
      <Text style={s.sub}>Send something from any of your devices and it shows up here for 24 hours.</Text>
      <Text style={s.label}>Three ways to send</Text>
      <View style={s.group}>
        {ways.map(([title, sub], index) => (
          <View key={title} style={s.row}>
            {index > 0 && <View style={s.sep} />}
            <View style={s.step}><Text style={s.stepText}>{index + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{title}</Text>
              <Text style={s.rowSub}>{sub}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const emptyStyles = (v: V2) =>
  StyleSheet.create({
    wrap: { paddingHorizontal: 4 },
    today: { color: v.ink, fontFamily: tokens.fonts.extrabold, fontSize: 32, letterSpacing: -0.6, marginTop: 2 },
    dz: { width: 200, height: 132, alignSelf: "center", marginTop: 28, marginBottom: 22, borderRadius: 24, borderWidth: 1.5, borderStyle: "dashed", borderColor: v.ink3, alignItems: "center", justifyContent: "center" },
    title: { color: v.ink, fontFamily: tokens.fonts.extrabold, fontSize: 22, letterSpacing: -0.2, textAlign: "center", marginBottom: 6 },
    sub: { color: v.ink2, fontFamily: tokens.fonts.regular, fontSize: 16, lineHeight: 22, textAlign: "center", alignSelf: "center", maxWidth: 290 },
    label: { color: v.ink2, fontFamily: tokens.fonts.extrabold, fontSize: 14, marginTop: 26, marginBottom: 8, marginHorizontal: 4 },
    group: { borderRadius: 18, backgroundColor: v.surface, borderWidth: 1, borderColor: v.edge, overflow: "hidden" },
    row: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
    sep: { position: "absolute", top: 0, left: 54, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: v.hair },
    step: { width: 28, height: 28, borderRadius: 14, backgroundColor: v.fill, alignItems: "center", justifyContent: "center" },
    stepText: { color: v.ink2, fontFamily: tokens.fonts.extrabold, fontSize: 13 },
    rowTitle: { color: v.ink, fontFamily: tokens.fonts.semibold, fontSize: 15.5 },
    rowSub: { color: v.ink3, fontFamily: tokens.fonts.regular, fontSize: 13 },
  });

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
    compactTop: {
      gap: tokens.compact.gap,
      paddingHorizontal: tokens.layout.screenPadding,
      paddingBottom: tokens.compact.gap,
    },
    compactHeader: {
      gap: tokens.compact.padding,
      marginBottom: tokens.compact.gap,
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
      gap: tokens.spacing.sm,
    },
    dockNote: {
      alignSelf: "center",
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
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
    signedInAs: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
      textAlign: "center",
    },
  });
