import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, useThemedStyles } from "../design/ThemeProvider";
import type { Palette } from "../design/theme";
import { tokens } from "../design/tokens";
import type { AuthCallbackNotice } from "../hooks/useSession";
import { LogoMark } from "./LogoMark";
import { PillButton } from "./PillButton";

type Props = {
  onSignIn: (email: string, password: string) => Promise<string | null>;
  onSignUp: (email: string, password: string) => Promise<string | null>;
  onResendSignUp: (email: string) => Promise<string | null>;
  onRequestPasswordReset: (email: string) => Promise<string | null>;
  onUpdatePassword: (password: string) => Promise<string | null>;
  onSignInWithGoogle: () => Promise<string | null>;
  onSignInWithApple: () => Promise<string | null>;
  appleSignInEnabled: boolean;
  passwordRecovery: boolean;
  authCallbackNotice: AuthCallbackNotice | null;
};

export function SignInScreen({
  onSignIn,
  onSignUp,
  onResendSignUp,
  onRequestPasswordReset,
  onUpdatePassword,
  onSignInWithGoogle,
  onSignInWithApple,
  appleSignInEnabled,
  passwordRecovery,
  authCallbackNotice,
}: Props) {
  const { palette, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "ios" || !appleSignInEnabled) return;
    let active = true;
    void AppleAuthentication.isAvailableAsync().then((available) => { if (active) setAppleAvailable(available); }).catch(() => {});
    return () => { active = false; };
  }, [appleSignInEnabled]);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signIn" | "signUp" | "resetRequest" | "resetPassword" | "checkEmail">(
    passwordRecovery ? "resetPassword" : "signIn",
  );
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (passwordRecovery) setMode("resetPassword");
  }, [passwordRecovery]);

  useEffect(() => {
    if (!authCallbackNotice) return;
    setEmail(authCallbackNotice.email);
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setMode(authCallbackNotice.kind === "reset" ? "resetRequest" : "signIn");
  }, [authCallbackNotice]);

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const message = await onSignIn(email, password);
    setBusy(false);
    if (message) setError(message);
  }

  async function submitSignUp() {
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setBusy(true);
    setError(null);
    const message = await onSignUp(email, password);
    setBusy(false);
    if (message) setError(message);
    else {
      setMode("checkEmail");
      setCooldown(60);
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    setBusy(true);
    setError(null);
    const message = await onResendSignUp(email);
    setBusy(false);
    if (message) setError(message);
    else setCooldown(60);
  }

  async function requestReset() {
    if (!email.includes("@")) return setError("Enter a valid email address.");
    setBusy(true);
    setError(null);
    const message = await onRequestPasswordReset(email);
    setBusy(false);
    if (message) setError(message);
    else setMode("checkEmail");
  }

  async function saveNewPassword() {
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setBusy(true);
    setError(null);
    const message = await onUpdatePassword(password);
    setBusy(false);
    if (message) setError(message);
    else setMode("signIn");
  }

  async function google() {
    setBusy(true);
    setError(null);
    const message = await onSignInWithGoogle();
    setBusy(false);
    if (message) setError(message);
  }

  async function apple() {
    setBusy(true);
    setError(null);
    const message = await onSignInWithApple();
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
          {mode === "signUp" ? "Join flick" : mode === "resetPassword" ? "Choose a new password" : "Sign in to flick"}
        </Text>
        <Text style={styles.sub}>
          {mode === "checkEmail" ? `Check ${email} for a link from Flick.` : "Sign in to send files to all your devices."}
        </Text>
        {authCallbackNotice && (
          <Text accessibilityRole="alert" style={styles.notice}>
            {authCallbackNotice.kind === "confirmed"
              ? "Email confirmed! Go back to the device where you signed up, or log in here."
              : "This reset link was opened on another device. Open it on the device where you requested it, or resend the link here."}
          </Text>
        )}

        <View style={styles.form}>
          {mode !== "checkEmail" && mode !== "resetPassword" && (
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              value={email}
              onChangeText={setEmail}
              editable={!busy}
              accessibilityLabel="Email"
            />
          )}
          {(mode === "signIn" || mode === "signUp") && (
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={palette.textMuted}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={mode === "signIn" ? submit : submitSignUp}
              returnKeyType="go"
              editable={!busy}
              accessibilityLabel="Password"
            />
          )}
          {(mode === "signUp" || mode === "resetPassword") && (
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={palette.textMuted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!busy}
              accessibilityLabel="Confirm password"
            />
          )}
          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          {mode === "signIn" && <>
            <PillButton label={busy ? "Signing in…" : "Sign in"} onPress={submit} busy={busy} disabled={!canSubmit} />
            <Text style={styles.link} onPress={() => { setMode("resetRequest"); setError(null); }}>Forgot password?</Text>
            <Text style={styles.or}>or</Text>
            <PillButton label="Continue with Google" variant="secondary" onPress={google} disabled={busy} />
            {appleAvailable && <View pointerEvents={busy ? "none" : "auto"} accessibilityState={{ disabled: busy }}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={scheme === "dark" ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={tokens.radii.pill}
                style={{ width: "100%", height: tokens.layout.inputHeight }}
                onPress={() => { if (!busy) void apple(); }}
              />
            </View>}
            <Text style={styles.link} onPress={() => { setMode("signUp"); setError(null); }}>Don’t have an account? Sign up</Text>
          </>}
          {mode === "signUp" && <>
            <PillButton label={busy ? "Creating account…" : "Create account"} onPress={submitSignUp} busy={busy} disabled={busy} />
            <Text style={styles.link} onPress={() => { setMode("signIn"); setError(null); }}>Already have an account? Log in</Text>
          </>}
          {mode === "resetRequest" && <>
            <PillButton label={busy ? "Sending…" : "Send reset link"} onPress={requestReset} busy={busy} disabled={busy} />
            <Text style={styles.link} onPress={() => { setMode("signIn"); setError(null); }}>Back to sign in</Text>
          </>}
          {mode === "resetPassword" && <>
            <PillButton label={busy ? "Saving…" : "Save password"} onPress={saveNewPassword} busy={busy} disabled={busy} />
          </>}
          {mode === "checkEmail" && <>
            <PillButton label="I’ve confirmed — log in" onPress={() => { setMode("signIn"); setPassword(""); setConfirmPassword(""); setError(null); }} disabled={busy} />
            <PillButton label={cooldown ? `Resend in ${cooldown}s` : "Resend email"} onPress={resend} disabled={busy || cooldown > 0} />
            <Text style={styles.link} onPress={() => { setMode("signIn"); setError(null); }}>Back to sign in</Text>
          </>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.background,
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
      color: c.text,
      fontFamily: tokens.fonts.extrabold,
      fontSize: tokens.fontSizes.heading,
    },
    sub: {
      color: c.textMuted,
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
      borderColor: c.outline,
      backgroundColor: c.card,
      color: c.text,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.body,
    },
    or: {
      color: c.textMuted,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
      textAlign: "center",
    },
    error: {
      color: c.text,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
      textAlign: "center",
    },
    notice: {
      maxWidth: 330,
      color: c.text,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
      textAlign: "center",
    },
    link: {
      color: c.text,
      fontFamily: tokens.fonts.semibold,
      fontSize: tokens.fontSizes.meta,
      textAlign: "center",
      textDecorationLine: "underline",
    },
  });
