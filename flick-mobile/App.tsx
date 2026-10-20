import {
  Nunito_600SemiBold,
  Nunito_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/nunito";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HomeScreen } from "./src/components/HomeScreen";
import { SignInScreen } from "./src/components/SignInScreen";
import { ThemeProvider, useTheme, useThemedStyles } from "./src/design/ThemeProvider";
import type { Palette } from "./src/design/theme";
import { useSession } from "./src/hooks/useSession";

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const [fontsLoaded] = useFonts({ Nunito_600SemiBold, Nunito_800ExtraBold });
  const { session, loading, signIn, signOut } = useSession();
  const { palette, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {!fontsLoaded || loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={palette.text} />
        </View>
      ) : session ? (
        <HomeScreen userId={session.user.id} email={session.user.email ?? null} onSignOut={signOut} />
      ) : (
        <SignInScreen onSignIn={signIn} />
      )}
    </>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.background,
    },
  });
