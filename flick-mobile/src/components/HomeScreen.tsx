import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tokens } from "../design/tokens";
import { useOpenFile } from "../hooks/useOpenFile";
import { useRecentFiles } from "../hooks/useRecentFiles";
import { useRemoveFile } from "../hooks/useRemoveFile";
import { useUpload } from "../hooks/useUpload";
import type { FileRow } from "../lib/types";
import { FileActions } from "./FileActions";
import { FileCard } from "./FileCard";
import { Header } from "./Header";
import { PillButton } from "./PillButton";
import { UploadCard } from "./UploadCard";

type Props = {
  userId: string;
  onSignOut: () => void;
};

export function HomeScreen({ userId, onSignOut }: Props) {
  const recent = useRecentFiles(userId);
  const { state: upload, pickAndUpload, reset } = useUpload(recent.refresh);
  const opener = useOpenFile();
  const remover = useRemoveFile(recent.refresh);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      const selected = selectedId === item.id;
      const opening = opener.openingId === item.id;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityHint={selected ? "Hides file actions" : "Shows preview and remove"}
          onPress={() => setSelectedId(selected ? null : item.id)}
          style={[
            index % 2 === 0 ? styles.tiltLeft : styles.tiltRight,
            selected && styles.selectedCard,
          ]}
        >
          <FileCard
            name={item.name}
            size={item.size}
            mimeType={item.mime_type}
            tone={opening ? "sending" : "plain"}
            status={opening ? "Opening…" : item.delivered_at ? "Landed" : "Waiting for your devices"}
          >
            {selected && !opening && (
              <FileActions
                fileName={item.name}
                onPreview={() => opener.open(item)}
                onRemove={() => {
                  setSelectedId(null);
                  remover.remove(item);
                }}
              />
            )}
          </FileCard>
        </Pressable>
      );
    },
    [selectedId, opener.open, opener.openingId, remover.remove],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <FlatList
        data={visibleFiles}
        extraData={selectedId}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.colors.navy} />
        }
        ListHeaderComponent={
          <View style={styles.top}>
            <Header status="connected" />
            <Text accessibilityRole="header" style={styles.heading}>
              Flick it to all your devices
            </Text>
            <UploadCard state={upload} onDismiss={reset} />
            <Text accessibilityRole="header" style={styles.eyebrow}>
              RECENTLY SENT
            </Text>
            {(remover.error ?? opener.error) && (
              <Text accessibilityRole="alert" style={styles.openError}>
                {remover.error ?? opener.error}
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
          onPress={pickAndUpload}
          busy={upload.kind === "uploading"}
          accessibilityHint="Pick a file to send to all your devices"
        />
        <Pressable
          accessibilityRole="button"
          onPress={onSignOut}
          style={styles.signOut}
          hitSlop={tokens.spacing.sm}
        >
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.background,
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
    color: tokens.colors.text,
    fontFamily: tokens.fonts.extrabold,
    fontSize: tokens.fontSizes.heading,
  },
  eyebrow: {
    marginTop: tokens.spacing.sm,
    color: tokens.colors.muted,
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
    backgroundColor: tokens.colors.navy,
  },
  undoText: {
    flex: 1,
    color: tokens.colors.cream,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.meta,
  },
  undoButton: {
    minHeight: tokens.layout.minTouchTarget,
    paddingHorizontal: tokens.spacing.md,
    justifyContent: "center",
  },
  undoLabel: {
    color: tokens.colors.yellow,
    fontFamily: tokens.fonts.extrabold,
    fontSize: tokens.fontSizes.body,
  },
  openError: {
    color: tokens.colors.text,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.meta,
  },
  empty: {
    color: tokens.colors.muted,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.body,
  },
  thumbZone: {
    paddingHorizontal: tokens.layout.screenPadding,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  signOut: {
    minHeight: tokens.layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutLabel: {
    color: tokens.colors.muted,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.meta,
  },
});
