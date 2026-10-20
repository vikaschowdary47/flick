import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";

export type FileMenuItem = {
  key: string;
  label: string;
  icon: ReactNode;
  fill: "preview" | "pin" | "danger";
  onPress: () => void;
};

type Props = {
  title: string | null; // file name; null hides the menu
  anchorY: number; // where the card was touched, in window coordinates
  items: FileMenuItem[];
  onClose: () => void;
};

const ITEM_HEIGHT = tokens.layout.minTouchTarget + tokens.spacing.xs;

// Dropdown that opens next to the touched card. Tapping outside closes it.
export function FileMenu({ title, anchorY, items, onClose }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Keep the whole menu on screen: open below the touch point, or above it
  // when there isn't room.
  const menuHeight = items.length * ITEM_HEIGHT + tokens.spacing.xl * 2;
  const below = anchorY + tokens.spacing.sm;
  const top = Math.max(
    insets.top + tokens.spacing.sm,
    below + menuHeight > height - insets.bottom ? anchorY - menuHeight - tokens.spacing.sm : below,
  );

  return (
    <Modal visible={title !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close menu" style={styles.scrim} onPress={onClose} />
      <View
        accessibilityViewIsModal
        style={[styles.menu, { top, left: (width - tokens.layout.menuWidth) / 2 }]}
      >
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="middle">
          {title}
        </Text>
        {items.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="menuitem"
            accessibilityLabel={`${item.label} ${title ?? ""}`}
            onPress={() => {
              onClose();
              item.onPress();
            }}
            style={({ pressed }) => [styles.item, styles[item.fill], pressed && styles.pressed]}
          >
            {item.icon}
            <Text style={styles.label}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    scrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.scrim,
    },
    menu: {
      position: "absolute",
      width: tokens.layout.menuWidth,
      gap: tokens.spacing.xs,
      padding: tokens.spacing.sm,
      borderRadius: tokens.radii.card,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
      backgroundColor: c.card,
      ...tokens.shadows.sticker,
      shadowColor: c.shadow,
    },
    title: {
      paddingHorizontal: tokens.spacing.sm,
      paddingVertical: tokens.spacing.xs,
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.md,
      minHeight: tokens.layout.minTouchTarget,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radii.thumbnail,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.outline,
    },
    preview: {
      backgroundColor: c.documentTile,
    },
    pin: {
      backgroundColor: c.pinBadge,
    },
    danger: {
      backgroundColor: c.dangerFill,
    },
    pressed: {
      opacity: 0.75,
    },
    label: {
      color: c.onColor,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.body,
    },
  });
