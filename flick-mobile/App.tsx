// Only the three weights the app uses. Importing from the package root would
// bundle every Hanken Grotesk file.
import { HankenGrotesk_400Regular } from "@expo-google-fonts/hanken-grotesk/400Regular";
import { HankenGrotesk_500Medium } from "@expo-google-fonts/hanken-grotesk/500Medium";
import { HankenGrotesk_600SemiBold } from "@expo-google-fonts/hanken-grotesk/600SemiBold";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FirstRunProfile } from "./src/components/FirstRunProfile";
import { useOnboarding } from "./src/hooks/useOnboarding";
import { HomeScreen } from "./src/components/HomeScreen";
import { SignInScreen } from "./src/components/SignInScreen";
import { ThemeProvider, useTheme, useThemedStyles } from "./src/design/ThemeProvider";
import type { Palette } from "./src/design/theme";
import { FeatureFlagsProvider } from "./src/hooks/useFeatureFlags";
import { APPLE_SIGN_IN_ENABLED, useSession } from "./src/hooks/useSession";
import { AppMark } from "./src/components/Icons";

// Keep the launch screen (the app mark) up until fonts and the saved sign-in
// are loaded, so the app never flashes a blank screen or a plain spinner.
void SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const [fontsLoaded] = useFonts({ HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold });
  const {
    session,
    loading,
    passwordRecovery,
    authCallbackNotice,
    signIn,
    signUp,
    resendSignUp,
    requestPasswordReset,
    updatePassword,
    signInWithGoogle,
    signInWithApple,
    signOut,
    deleteAccount,
  } = useSession();
  const onboarding = useOnboarding(session);
  const { palette, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const ready = fontsLoaded && !loading;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {!fontsLoaded || loading ? (
        // Same as the launch screen, in case it has already gone (Expo Go).
        <View style={styles.loading}>
          <AppMark size={88} />
          <ActivityIndicator style={styles.spinner} color={palette.textMuted} />
        </View>
      ) : session && !passwordRecovery ? (
        !onboarding.ready ? <FirstRunProfile key={session.user.id} initialName={onboarding.initialName} initialType={onboarding.initialType}
          loading={onboarding.loading} error={onboarding.error} onRetry={onboarding.retry} onSave={onboarding.save} onSignOut={signOut} /> : (
        <FeatureFlagsProvider userId={session.user.id}>
          <HomeScreen userId={session.user.id} email={session.user.email ?? null} onSignOut={signOut} onDeleteAccount={deleteAccount} />
        </FeatureFlagsProvider>
        )
      ) : (
        <SignInScreen
          onSignIn={signIn}
          onSignUp={signUp}
          onResendSignUp={resendSignUp}
          onRequestPasswordReset={requestPasswordReset}
          onUpdatePassword={updatePassword}
          onSignInWithGoogle={signInWithGoogle}
          onSignInWithApple={signInWithApple}
          appleSignInEnabled={APPLE_SIGN_IN_ENABLED}
          passwordRecovery={passwordRecovery}
          authCallbackNotice={authCallbackNotice}
        />
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
    spinner: {
      position: "absolute",
      bottom: 96,
    },
  });
