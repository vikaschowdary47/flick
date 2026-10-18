import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tokens } from "../design/tokens";
import { useRecentFiles } from "../hooks/useRecentFiles";
import { useUpload } from "../hooks/useUpload";
import type { FileRow } from "../lib/types";
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
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await recent.refresh();
    setRefreshing(false);
  }, [recent.refresh]);

  const renderItem = useCallback(
    ({ item, index }: { item: FileRow; index: number }) => (
      <View style={index % 2 === 0 ? styles.tiltLeft : styles.tiltRight}>
        <FileCard
          name={item.name}
          size={item.size}
          mimeType={item.mime_type}
          tone="plain"
          status={item.delivered_at ? "Landed" : "Waiting for your devices"}
          badge={item.delivered_at ? "Got it!" : undefined}
        />
      </View>
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <FlatList
        data={recent.files}
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
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {recent.loading ? "Loading…" : recent.error ?? "Nothing yet. Flick something over!"}
          </Text>
        }
      />

      <View style={styles.thumbZone}>
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
