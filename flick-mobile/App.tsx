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
import { tokens } from "./src/design/tokens";
import { useSession } from "./src/hooks/useSession";

export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_600SemiBold, Nunito_800ExtraBold });
  const { session, loading, signIn, signOut } = useSession();

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!fontsLoaded || loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={tokens.colors.navy} />
        </View>
      ) : session ? (
        <HomeScreen onFlick={() => {}} onSignOut={signOut} />
      ) : (
        <SignInScreen onSignIn={signIn} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.background,
  },
});
