import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactElement } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { groupFiles, loadCollapsed, saveCollapsed, SECTION_TITLES, type SectionKey } from "../lib/sections";
import type { FileRow } from "../lib/types";
import { CompactFileRow } from "./CompactFileRow";
import { ImageTile } from "./ImageTile";

const SECTION_PREVIEW = 5; // items shown before "+N more"

type Item =
  | { type: "row"; key: string; file: FileRow }
  | { type: "grid"; key: string; files: FileRow[] }
  | { type: "more"; key: string; section: SectionKey; count: number };

type Section = { key: SectionKey; total: number; collapsed: boolean; data: Item[] };

type Props = {
  files: FileRow[];
  header: ReactElement;
  empty: ReactElement;
  now: number;
  senderOf: (file: FileRow) => string;
  openingId: string | null;
  selectedId: string | null;
  onMenu: (file: FileRow, pageY: number) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

const isImage = (file: FileRow) => (file.mime_type ?? "").startsWith("image/");

// Compact files: Pinned / Today / Earlier sections (collapsible, "+N more"),
// images packed into rows of 3 tiles, everything else as 52pt rows.
// A SectionList so only what's on screen is rendered.
export type CompactFilesListHandle = { scrollToTop: () => void };

export const CompactFilesList = forwardRef<CompactFilesListHandle, Props>(function CompactFilesList(
  { files, header, empty, now, senderOf, openingId, selectedId, onMenu, refreshing, onRefresh, onScroll },
  ref,
) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const [collapsed, setCollapsed] = useState<SectionKey[]>([]);
  const [expanded, setExpanded] = useState<SectionKey[]>([]);
  const listRef = useRef<SectionList<Item, Section>>(null);
  useImperativeHandle(ref, () => ({
    scrollToTop: () => listRef.current?.getScrollResponder()?.scrollTo({ y: 0, animated: true }),
  }));

  useEffect(() => {
    void loadCollapsed().then(setCollapsed);
  }, []);

  const columns = tokens.compact.gridColumns;
  const tileSize = Math.floor(
    (width - tokens.layout.screenPadding * 2 - tokens.compact.gap * (columns - 1)) / columns,
  );

  const sections: Section[] = useMemo(
    () =>
      groupFiles(files, now).map(({ key, files: sectionFiles }) => {
        const isCollapsed = collapsed.includes(key);
        const shown = expanded.includes(key) ? sectionFiles : sectionFiles.slice(0, SECTION_PREVIEW);
        const images = shown.filter(isImage);
        const data: Item[] = [];
        if (!isCollapsed) {
          for (let i = 0; i < images.length; i += columns) {
            const chunk = images.slice(i, i + columns);
            data.push({ type: "grid", key: `${key}-grid-${chunk[0].id}`, files: chunk });
          }
          for (const file of shown) {
            if (!isImage(file)) data.push({ type: "row", key: file.id, file });
          }
          if (shown.length < sectionFiles.length) {
            data.push({ type: "more", key: `${key}-more`, section: key, count: sectionFiles.length - shown.length });
          }
        }
        return { key, total: sectionFiles.length, collapsed: isCollapsed, data };
      }),
    [files, now, collapsed, expanded, columns],
  );

  const toggle = useCallback((key: SectionKey) => {
    setCollapsed((current) => {
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      saveCollapsed(next);
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Item }) => {
      if (item.type === "row") {
        return (
          <CompactFileRow
            file={item.file}
            now={now}
            sender={senderOf(item.file)}
            opening={openingId === item.file.id}
            selected={selectedId === item.file.id}
            onMenu={onMenu}
          />
        );
      }
      if (item.type === "grid") {
        return (
          <View style={styles.gridRow}>
            {item.files.map((file) => (
              <ImageTile
                key={file.id}
                file={file}
                size={tileSize}
                now={now}
                sender={senderOf(file)}
                opening={openingId === file.id}
                selected={selectedId === file.id}
                onMenu={onMenu}
              />
            ))}
          </View>
        );
      }
      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((current) => [...current, item.section])}
          style={styles.moreChip}
        >
          <Text style={styles.moreLabel}>+{item.count} more</Text>
        </Pressable>
      );
    },
    [now, senderOf, openingId, selectedId, onMenu, tileSize, styles],
  );

  return (
    <SectionList
      ref={listRef}
      sections={sections}
      keyExtractor={(item) => item.key}
      renderItem={renderItem}
      renderSectionHeader={({ section }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: !section.collapsed }}
          accessibilityLabel={`${SECTION_TITLES[section.key]}, ${section.total} files`}
          onPress={() => toggle(section.key)}
          style={styles.sectionHeader}
        >
          <Text style={styles.sectionTitle}>
            {section.collapsed ? "▸" : "▾"} {SECTION_TITLES[section.key]}
          </Text>
          <Text style={styles.sectionCount}>{section.total}</Text>
        </Pressable>
      )}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ItemSeparatorComponent={Gap}
      SectionSeparatorComponent={Gap}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.text} />}
      onScroll={onScroll}
      scrollEventThrottle={16}
      // Virtualization: render a screenful first, then small batches.
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={9}
      removeClippedSubviews={Platform.OS === "android"}
    />
  );
});

function Gap() {
  return <View style={{ height: tokens.compact.gap }} />;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: tokens.layout.screenPadding,
      paddingTop: tokens.spacing.sm,
      paddingBottom: tokens.spacing.lg,
    },
    gridRow: {
      flexDirection: "row",
      gap: tokens.compact.gap,
    },
    sectionHeader: {
      height: tokens.compact.sectionHeaderHeight,
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.sm,
    },
    sectionTitle: {
      color: c.textMuted,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.eyebrow - 1,
      letterSpacing: tokens.letterSpacing.eyebrow,
    },
    sectionCount: {
      paddingHorizontal: tokens.spacing.sm - 2,
      borderRadius: tokens.radii.pill,
      borderWidth: 1,
      borderColor: c.textMuted,
      color: c.textMuted,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.compact.meta - 2,
    },
    moreChip: {
      alignSelf: "flex-start",
      height: tokens.compact.moreChipHeight,
      justifyContent: "center",
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.pinBadge,
    },
    moreLabel: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.compact.meta,
    },
  });
