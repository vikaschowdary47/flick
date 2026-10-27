import type React from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../design/ThemeProvider";
import { useV2, type V2 } from "../design/v2";
import { AppMark } from "./Icons";
import { tokens } from "../design/tokens";
import type { AuthCallbackNotice } from "../hooks/useSession";
import { GoogleIcon } from "./GoogleIcon";

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
  const { scheme } = useTheme();
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
    if (!error) return;
    const timer = setTimeout(() => setError(null), 10_000);
    return () => clearTimeout(timer);
  }, [error]);

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

  const v = useV2();
  const st = makeV2Styles(v);
  const heading =
    mode === "signUp" ? "Create your account." :
    mode === "resetRequest" ? "Reset your password." :
    mode === "resetPassword" ? "Choose a new password." :
    mode === "checkEmail" ? "Check your email." :
    "Catch files from your other devices.";
  const lead =
    mode === "checkEmail" ? `We sent a link to ${email}. Open it on this phone.` :
    mode === "resetRequest" ? "We’ll email you a link to set a new one." :
    mode === "resetPassword" ? "Use at least 8 characters." :
    "Sign in with the same account on every device.";

  return (
    <SafeAreaView style={st.safe}>
      <KeyboardAvoidingView style={st.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={st.auth} keyboardShouldPersistTaps="handled">
          <View style={st.icon}><AppMark size={56} /></View>
          <Text accessibilityRole="header" style={st.h1}>{heading}</Text>
          <Text style={st.lead}>{lead}</Text>
          {authCallbackNotice && (
            <Text accessibilityRole="alert" style={st.notice}>
              {authCallbackNotice.kind === "confirmed"
                ? "Email confirmed! Go back to the device where you signed up, or sign in here."
                : "This reset link was opened on another device. Open it on the device where you asked for it, or send a new link here."}
            </Text>
          )}
          {error && (
            <Pressable accessibilityRole="alert" accessibilityHint="Tap to dismiss" onPress={() => setError(null)} style={st.error}>
              <Text style={st.errorText}>{error}</Text>
            </Pressable>
          )}

          {mode === "signIn" && (
            <>
              <Big st={st} v={v} busy={busy} label="Continue with Google" onPress={google} disabled={busy} icon={<GoogleIcon />} />
              {appleAvailable && (
                <View style={{ marginTop: 10 }} pointerEvents={busy ? "none" : "auto"} accessibilityState={{ disabled: busy }}>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={scheme === "dark" ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={14}
                    style={{ width: "100%", height: 54 }}
                    onPress={() => { if (!busy) void apple(); }}
                  />
                </View>
              )}
              <View style={st.or}><View style={st.orLine} /><Text style={st.orText}>or</Text><View style={st.orLine} /></View>
            </>
          )}

          {mode !== "checkEmail" && (
            <View style={st.fields}>
              {mode !== "resetPassword" && (
                <Field st={st} v={v} busy={busy} label="Email" placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="username" value={email} onChangeText={setEmail} />
              )}
              {(mode === "signIn" || mode === "signUp") && (
                <>
                  <View style={st.fieldLine} />
                  <Field st={st} v={v} busy={busy} label="Password" placeholder="Required" secureTextEntry autoComplete="password" textContentType="password" value={password} onChangeText={setPassword} onSubmitEditing={mode === "signIn" ? submit : submitSignUp} returnKeyType="go" />
                </>
              )}
              {mode === "resetPassword" && (
                <Field st={st} v={v} busy={busy} label="Password" placeholder="New password" secureTextEntry value={password} onChangeText={setPassword} />
              )}
              {(mode === "signUp" || mode === "resetPassword") && (
                <>
                  <View style={st.fieldLine} />
                  <Field st={st} v={v} busy={busy} label="Confirm" placeholder="Same again" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
                </>
              )}
            </View>
          )}

          {mode === "signIn" && (
            <>
              <Big st={st} v={v} busy={busy} primary label={busy ? "Signing in…" : "Sign in"} onPress={submit} disabled={!canSubmit || busy} />
              <View style={st.links}>
                <Text accessibilityRole="button" style={st.linkText} onPress={() => { setMode("resetRequest"); setError(null); }}>Forgot password?</Text>
                <Text accessibilityRole="button" style={st.linkText} onPress={() => { setMode("signUp"); setError(null); }}>Create account</Text>
              </View>
            </>
          )}
          {mode === "signUp" && (
            <>
              <Big st={st} v={v} busy={busy} primary label={busy ? "Creating account…" : "Create account"} onPress={submitSignUp} disabled={busy} />
              <View style={st.links}><Text accessibilityRole="button" style={st.linkText} onPress={() => { setMode("signIn"); setError(null); }}>I already have an account</Text></View>
            </>
          )}
          {mode === "resetRequest" && (
            <>
              <Big st={st} v={v} busy={busy} primary label={busy ? "Sending…" : "Send reset link"} onPress={requestReset} disabled={busy} />
              <View style={st.links}><Text accessibilityRole="button" style={st.linkText} onPress={() => { setMode("signIn"); setError(null); }}>Back to sign in</Text></View>
            </>
          )}
          {mode === "resetPassword" && <Big st={st} v={v} busy={busy} primary label={busy ? "Saving…" : "Save password"} onPress={saveNewPassword} disabled={busy} />}
          {mode === "checkEmail" && (
            <>
              <Big st={st} v={v} busy={busy} primary label="I’ve confirmed, sign in" onPress={() => { setMode("signIn"); setPassword(""); setConfirmPassword(""); setError(null); }} disabled={busy} />
              <View style={{ height: 10 }} />
              <Big st={st} v={v} busy={busy} label={cooldown ? `Resend in ${cooldown} s` : "Resend email"} onPress={resend} disabled={busy || cooldown > 0} />
              <View style={st.links}><Text accessibilityRole="button" style={st.linkText} onPress={() => { setMode("signIn"); setError(null); }}>Back to sign in</Text></View>
            </>
          )}

          <View style={st.grow} />
          <Text style={st.trust}>Files are deleted from our servers 24 hours after you send them.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type St = ReturnType<typeof makeV2Styles>;

// Module-level so inputs keep focus while typing (a component defined inside
// render would remount on every keystroke).
function Big({ st, v, busy, label, onPress, primary, disabled, icon }: { st: St; v: V2; busy: boolean; label: string; onPress: () => void; primary?: boolean; disabled?: boolean; icon?: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [st.big, primary ? st.prim : st.sec, disabled && st.disabled, pressed && st.pressed]}
    >
      {icon}
      <Text style={[st.bigLabel, primary && { color: v.onAmber }]}>{label}</Text>
    </Pressable>
  );
}

function Field({ st, v, busy, label, ...input }: { st: St; v: V2; busy: boolean; label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={st.field}>
      <Text style={st.fieldLabel}>{label}</Text>
      <TextInput style={st.fieldInput} placeholderTextColor={v.ink3} editable={!busy} accessibilityLabel={label} {...input} />
    </View>
  );
}

const makeV2Styles = (v: V2) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: v.canvas },
    flex: { flex: 1 },
    auth: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24 },
    icon: { width: 56, height: 56, borderRadius: 13, overflow: "hidden" },
    h1: { marginTop: 28, marginBottom: 8, color: v.ink, fontFamily: tokens.fonts.extrabold, fontSize: 28, lineHeight: 32, letterSpacing: -0.4 },
    lead: { marginBottom: 28, color: v.ink2, fontFamily: tokens.fonts.regular, fontSize: 16, lineHeight: 22 },
    notice: { marginTop: -14, marginBottom: 20, color: v.ink, fontFamily: tokens.fonts.semibold, fontSize: 14, lineHeight: 20 },
    error: { marginTop: -14, marginBottom: 18, padding: 12, borderRadius: 12, backgroundColor: v.fill, borderLeftWidth: 3, borderLeftColor: v.danger },
    errorText: { color: v.ink, fontFamily: tokens.fonts.semibold, fontSize: 14, lineHeight: 20 },
    big: { height: 54, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
    prim: { backgroundColor: v.amber, marginTop: 14 },
    sec: { backgroundColor: v.surface, borderWidth: 1, borderColor: v.edge },
    bigLabel: { color: v.ink, fontFamily: tokens.fonts.extrabold, fontSize: 17 },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.8 },
    or: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 18 },
    orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: v.hair },
    orText: { color: v.ink3, fontFamily: tokens.fonts.extrabold, fontSize: 13 },
    fields: { borderRadius: 16, backgroundColor: v.surface, borderWidth: 1, borderColor: v.edge, overflow: "hidden" },
    field: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 },
    fieldLabel: { width: 76, color: v.ink2, fontFamily: tokens.fonts.extrabold, fontSize: 15 },
    fieldInput: { flex: 1, minHeight: 54, color: v.ink, fontFamily: tokens.fonts.semibold, fontSize: 16 },
    fieldLine: { height: StyleSheet.hairlineWidth, marginLeft: 14, backgroundColor: v.hair },
    links: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
    linkText: { minHeight: 44, paddingVertical: 12, color: v.ink, fontFamily: tokens.fonts.extrabold, fontSize: 15 },
    grow: { flex: 1, minHeight: 24 },
    trust: { paddingHorizontal: 8, paddingBottom: 24, color: v.ink3, fontFamily: tokens.fonts.regular, fontSize: 13, lineHeight: 18, textAlign: "center" },
  });
