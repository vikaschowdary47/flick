import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactElement } from "react";
import {
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { useV2, type V2 } from "../design/v2";
import { groupFiles, loadCollapsed, saveCollapsed, SECTION_TITLES, type SectionKey } from "../lib/sections";
import type { FileRow } from "../lib/types";
import { CompactFileRow, type GroupPosition } from "./CompactFileRow";
import { ImageTile } from "./ImageTile";

const SECTION_PREVIEW = 5; // items shown before "+N more"

type Item =
  | { type: "row"; key: string; file: FileRow; position: GroupPosition }
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
  scrollY?: Animated.Value; // drives the shrinking header
};

const isImage = (file: FileRow) => (file.mime_type ?? "").startsWith("image/");

// Compact files: Pinned / Today / Earlier sections (collapsible, "+N more"),
// images packed into rows of 3 tiles, everything else as 52pt rows.
// A SectionList so only what's on screen is rendered.
export type CompactFilesListHandle = { scrollToTop: () => void };

export const CompactFilesList = forwardRef<CompactFilesListHandle, Props>(function CompactFilesList(
  { files, header, empty, now, senderOf, openingId, selectedId, onMenu, refreshing, onRefresh, scrollY },
  ref,
) {
  const { palette } = useTheme();
  const v2 = useV2();
  const styles = useMemo(() => makeStyles(palette, v2), [palette, v2]);
  const { width } = useWindowDimensions();
  const [collapsed, setCollapsed] = useState<SectionKey[]>([]);
  const [expanded, setExpanded] = useState<SectionKey[]>([]);
  const listRef = useRef<SectionList<Item, Section>>(null);
  // Scroll position for the header fade, tracked on the native side.
  const fallbackScroll = useRef(new Animated.Value(0)).current;
  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY ?? fallbackScroll } } }], { useNativeDriver: true }),
    [scrollY, fallbackScroll],
  );
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
        const data: Item[] = [];
        if (!isCollapsed) {
          // Redesign v2: one grouped list per section; images are rows with
          // their real thumbnail (no separate grid).
          shown.forEach((file, index) => {
            const position: GroupPosition =
              shown.length === 1 ? "single" : index === 0 ? "first" : index === shown.length - 1 ? "last" : "middle";
            data.push({ type: "row", key: file.id, file, position });
          });
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
            position={item.position}
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
    <Animated.SectionList
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
          <Text style={styles.sectionTitle}>{SECTION_TITLES[section.key]}</Text>
          <Text style={styles.sectionCount}>
            {section.collapsed ? `${section.total} hidden` : `${section.total} ${section.total === 1 ? "file" : "files"}`}
          </Text>
        </Pressable>
      )}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ItemSeparatorComponent={ItemGap}
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

// Rows in one group touch (they share a card); everything else gets a gap.
function ItemGap({ leadingItem, trailingItem }: { leadingItem?: Item; trailingItem?: Item }) {
  if (leadingItem?.type === "row" && trailingItem?.type === "row") return null;
  return <Gap />;
}

const makeStyles = (c: Palette, v: V2) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: tokens.spacing.lg,
    },
    gridRow: {
      flexDirection: "row",
      gap: tokens.compact.gap,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      paddingHorizontal: 4,
      paddingTop: 18,
      paddingBottom: 8,
    },
    sectionTitle: {
      color: v.ink2,
      fontFamily: tokens.fonts.extrabold,
      fontSize: 14,
    },
    sectionCount: {
      color: v.ink3,
      fontFamily: tokens.fonts.semibold,
      fontSize: 14,
      fontVariant: ["tabular-nums"],
    },
    moreChip: {
      alignSelf: "flex-start",
      height: 34,
      justifyContent: "center",
      marginTop: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: v.fill,
    },
    moreLabel: {
      color: v.ink,
      fontFamily: tokens.fonts.extrabold,
      fontSize: 13.5,
    },
  });
