// Only the two weights the app uses. Importing from the package root would
// bundle all 16 Nunito files (~2 MB).
import { Nunito_600SemiBold } from "@expo-google-fonts/nunito/600SemiBold";
import { Nunito_800ExtraBold } from "@expo-google-fonts/nunito/800ExtraBold";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HomeScreen } from "./src/components/HomeScreen";
import { SignInScreen } from "./src/components/SignInScreen";
import { ThemeProvider, useTheme, useThemedStyles } from "./src/design/ThemeProvider";
import type { Palette } from "./src/design/theme";
import { FeatureFlagsProvider } from "./src/hooks/useFeatureFlags";
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
  const { session, loading, signIn, signInWithGoogle, signOut } = useSession();
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
        <FeatureFlagsProvider userId={session.user.id}>
          <HomeScreen userId={session.user.id} email={session.user.email ?? null} onSignOut={signOut} />
        </FeatureFlagsProvider>
      ) : (
        <SignInScreen onSignIn={signIn} onSignInWithGoogle={signInWithGoogle} />
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
