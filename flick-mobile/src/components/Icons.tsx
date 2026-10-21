import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../design/ThemeProvider";
import { tokens } from "../design/tokens";

type Props = { size?: number; color?: string };

// Icons sit on colored stickers, so they default to the on-color ink.
function useInk(color?: string): string {
  const { palette } = useTheme();
  return color ?? palette.onColor;
}

// Same paths as the desktop widget's preview and remove icons.
export function EyeIcon({ size = tokens.layout.iconSize, color }: Props) {
  const ink = useInk(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <Circle cx={12} cy={12} r={2.7} />
    </Svg>
  );
}

export function CloseIcon({ size = tokens.layout.iconSize, color }: Props) {
  const ink = useInk(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round">
      <Path d="m6 6 12 12M18 6 6 18" />
    </Svg>
  );
}

export function TrashIcon({ size = tokens.layout.iconSize, color }: Props) {
  const ink = useInk(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </Svg>
  );
}

export function PinIcon({ size = tokens.layout.iconSize, color }: Props) {
  const ink = useInk(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 4h6l-1 6 3 3H7l3-3-1-6ZM12 13v7" />
    </Svg>
  );
}

export function ShareIcon({ size = tokens.layout.iconSize, color }: Props) {
  const ink = useInk(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </Svg>
  );
}

export function GearIcon({ size = tokens.layout.iconSize, color }: Props) {
  const ink = useInk(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={3} />
      <Path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
    </Svg>
  );
}

export function SignOutIcon({ size = tokens.layout.iconSize, color }: Props) {
  const ink = useInk(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9" />
    </Svg>
  );
}
