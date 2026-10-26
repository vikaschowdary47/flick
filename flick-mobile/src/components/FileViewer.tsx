import { useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import type { ViewerState } from "../hooks/useOpenFile";
import { ShareIcon } from "./Icons";

type Props = {
  viewer: ViewerState | null;
  onClose: () => void;
  onShare: () => void;
  onFailed: (file: ViewerState["file"]) => void;
};

// Full-screen Preview on iPhone. Shows only our cached copy of the file.
export function FileViewer({ viewer, onClose, onShare, onFailed }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal visible={viewer !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.bar}>
          <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.close, pressed ? styles.pressed : styles.raised]}>
            <Text style={styles.closeLabel}>Close</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="middle">
            {viewer?.file.name}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share file"
            onPress={onShare}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : styles.raised]}
          >
            <ShareIcon />
          </Pressable>
        </View>
        <View style={styles.body}>{viewer && <Content viewer={viewer} onFailed={onFailed} />}</View>
      </SafeAreaView>
    </Modal>
  );
}

function Content({ viewer, onFailed }: { viewer: ViewerState; onFailed: Props["onFailed"] }) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(viewer.kind === "document");

  if (viewer.kind === "image") {
    // iOS ScrollView pinch-zoom; double-tap isn't needed for a quick look.
    return (
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.center}
        maximumZoomScale={5}
        minimumZoomScale={1}
        centerContent
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={{ uri: viewer.uri }}
          style={{ width: width - tokens.layout.screenPadding * 2, height: height * 0.75 }}
          resizeMode="contain"
          accessibilityLabel={viewer.file.name}
          onError={() => onFailed(viewer.file)}
        />
      </ScrollView>
    );
  }

  if (viewer.kind === "source") {
    // HTML is shown as text only: never rendered, scripts never run.
    return (
      <ScrollView style={styles.fill} contentContainerStyle={styles.sourcePad}>
        <Text selectable style={styles.source}>
          {viewer.text}
        </Text>
      </ScrollView>
    );
  }

  // PDF, plain text, Office: WKWebView renders them natively. JavaScript is
  // off, file access is limited to this one file, and every navigation away
  // from it (links inside the document) is blocked.
  return (
    <View style={styles.fill}>
      <WebView
        source={{ uri: viewer.uri }}
        originWhitelist={["file://*"]}
        allowingReadAccessToURL={viewer.uri}
        allowFileAccess
        javaScriptEnabled={false}
        onShouldStartLoadWithRequest={(request) => request.url === viewer.uri}
        onLoadEnd={() => setLoading(false)}
        onError={() => onFailed(viewer.file)}
        style={styles.webview}
      />
      {loading && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={palette.text} />
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.background,
    },
    bar: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing.md,
      paddingHorizontal: tokens.layout.screenPadding,
      paddingVertical: tokens.spacing.sm,
    },
    close: {
      minHeight: tokens.layout.minTouchTarget,
      paddingHorizontal: tokens.spacing.lg,
      justifyContent: "center",
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.hairline,
      backgroundColor: c.card,
    },
    closeLabel: {
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.body,
    },
    title: {
      flex: 1,
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.cardTitle,
      textAlign: "center",
    },
    iconButton: {
      width: tokens.layout.minTouchTarget,
      height: tokens.layout.minTouchTarget,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: tokens.radii.pill,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.hairline,
      backgroundColor: c.archiveTile,
    },
    raised: {
      ...tokens.shadows.sticker,
      shadowColor: c.shadow,
    },
    pressed: {
      ...tokens.shadows.stickerPressed,
      shadowColor: c.shadow,
    },
    body: {
      flex: 1,
      margin: tokens.layout.screenPadding,
      marginTop: tokens.spacing.sm,
      overflow: "hidden",
      borderRadius: tokens.radii.card,
      borderWidth: tokens.borderWidth.outline,
      borderColor: c.hairline,
      backgroundColor: c.card,
    },
    fill: {
      flex: 1,
    },
    center: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    webview: {
      flex: 1,
      backgroundColor: c.card,
    },
    loading: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
    },
    sourcePad: {
      padding: tokens.spacing.md,
    },
    source: {
      color: c.text,
      fontFamily: tokens.fonts.mono,
      fontSize: tokens.fontSizes.meta,
    },
  });
