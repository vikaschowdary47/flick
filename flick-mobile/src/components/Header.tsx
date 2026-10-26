import { Image, Pressable, StyleSheet, View } from "react-native";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import { GearIcon } from "./Icons";
import { StatusPill, type Status } from "./StatusPill";

type Props = {
  status: Status;
  // Compact mode: a ⋯ button that opens Settings / Sign out.
  onMenu?: (pageY: number) => void;
};

export function Header({ status, onMenu }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { scheme, palette } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel="eqlShare"
          source={scheme === "dark" ? require("../../assets/lockup-dark.png") : require("../../assets/lockup-light.png")}
          resizeMode="contain"
          style={styles.lockup}
        />
      </View>
      <View style={styles.right}>
        <StatusPill status={status} />
        {onMenu && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings and sign out"
            onPress={(event) => onMenu(event.nativeEvent.pageY)}
            style={styles.menuButton}
          >
            <GearIcon size={19} color={palette.text} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: tokens.layout.minTouchTarget,
    },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.sm,
    },
    right: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.sm,
    },
    menuButton: {
      width: 36,
      height: 36,
      margin: (tokens.layout.minTouchTarget - 36) / 2,
      borderRadius: tokens.radii.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.fill,
    },
    lockup: {
      width: 120,
      height: 26,
    },
  });
