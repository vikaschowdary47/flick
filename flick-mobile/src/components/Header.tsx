import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "../design/tokens";
import { useV2, type V2 } from "../design/v2";
import { AppMark, GearIcon, LaptopIcon, PhoneIcon } from "./Icons";
import type { Status } from "./StatusPill";

export type DeviceKind = "phone" | "laptop";

type Props = {
  status: Status;
  // Your other devices (not this one), for the little stack in the presence pill.
  devices?: DeviceKind[];
  // How many of them were seen recently ("2 online").
  online?: number;
  // Opens Settings.
  onMenu?: (pageY: number) => void;
};

// Redesign v2 top bar: mark, "eqlShare", who you're connected to, Settings.
export function Header({ status, devices = [], online, onMenu }: Props) {
  const v = useV2();
  const s = makeStyles(v);
  const label = status === "offline" ? "Offline" : status === "signedOut" ? "Signed out" : online ? `${online} online` : devices.length > 0 ? `${devices.length} ${devices.length === 1 ? "device" : "devices"}` : "Connected";
  const live = status === "connected";
  return (
    <View style={s.bar}>
      <AppMark size={28} />
      <Text style={s.name} accessibilityRole="header" accessibilityLabel="eqlShare">
        <Text style={s.eql}>eql</Text>Share
      </Text>
      <View style={s.grow} />
      <View accessibilityRole="text" accessibilityLabel={`Status: ${live ? "connected" : label}${devices.length ? `, ${label}` : ""}`} style={s.presence}>
        {devices.length > 0 ? (
          <View style={s.devs}>
            {devices.slice(0, 3).map((kind, index) => (
              <View key={`${kind}-${index}`} style={[s.dev, index > 0 && s.devOverlap]}>
                {kind === "laptop" ? <LaptopIcon size={13} color={v.ink} /> : <PhoneIcon size={13} color={v.ink} />}
                {live && <View style={s.devDot} />}
              </View>
            ))}
          </View>
        ) : (
          <View style={[s.dot, live && s.dotLive]} />
        )}
        <Text style={s.presenceText}>{label}</Text>
      </View>
      {onMenu && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={(event) => onMenu(event.nativeEvent.pageY)}
          hitSlop={4}
          style={({ pressed }) => [s.ibtn, pressed && { opacity: 0.7 }]}
        >
          <GearIcon size={19} color={v.ink} />
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (v: V2) =>
  StyleSheet.create({
    bar: { flexDirection: "row", alignItems: "center", gap: 10, height: 48, paddingTop: 6, paddingLeft: 4, paddingRight: 2 },
    name: { color: v.ink, fontFamily: tokens.fonts.extrabold, fontSize: 17, letterSpacing: -0.17 },
    eql: { color: v.ink3 },
    grow: { flex: 1 },
    presence: { flexDirection: "row", alignItems: "center", gap: 8, height: 32, paddingLeft: 6, paddingRight: 10, borderRadius: 999, backgroundColor: v.fill },
    devs: { flexDirection: "row" },
    dev: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: v.surface, borderWidth: 2, borderColor: v.canvas },
    devOverlap: { marginLeft: -6 },
    devDot: { position: "absolute", right: -2, bottom: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: v.liveDot, borderWidth: 1.5, borderColor: v.canvas },
    dot: { width: 7, height: 7, marginLeft: 4, borderRadius: 4, backgroundColor: v.ink3 },
    dotLive: { backgroundColor: v.liveDot },
    presenceText: { color: v.ink2, fontFamily: tokens.fonts.extrabold, fontSize: 13 },
    ibtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: v.fill },
  });
