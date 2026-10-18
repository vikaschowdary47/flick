import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tokens } from "../design/tokens";
import { LogoMark } from "./LogoMark";
import { PillButton } from "./PillButton";

type Props = {
  onSignIn: (email: string, password: string) => Promise<string | null>;
};

export function SignInScreen({ onSignIn }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const message = await onSignIn(email, password);
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.center}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <LogoMark size={tokens.layout.signInMark} />
        <Text accessibilityRole="header" style={styles.heading}>
          Sign in to flick
        </Text>
        <Text style={styles.sub}>Sign in to send files to all your devices.</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={tokens.colors.muted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
            accessibilityLabel="Email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={tokens.colors.muted}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            returnKeyType="go"
            editable={!busy}
            accessibilityLabel="Password"
          />
          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <PillButton
            label={busy ? "Signing in…" : "Sign in"}
            onPress={submit}
            busy={busy}
            disabled={!canSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.layout.screenPadding,
    gap: tokens.spacing.md,
  },
  heading: {
    marginTop: tokens.spacing.sm,
    color: tokens.colors.text,
    fontFamily: tokens.fonts.extrabold,
    fontSize: tokens.fontSizes.heading,
  },
  sub: {
    color: tokens.colors.muted,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.body,
    textAlign: "center",
  },
  form: {
    alignSelf: "stretch",
    marginTop: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  input: {
    minHeight: tokens.layout.inputHeight,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radii.pill,
    borderWidth: tokens.borderWidth.outline,
    borderColor: tokens.colors.outline,
    backgroundColor: tokens.colors.white,
    color: tokens.colors.text,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.body,
  },
  error: {
    color: tokens.colors.text,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.meta,
    textAlign: "center",
  },
});
