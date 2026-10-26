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
      <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
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

// Redesign v2: send arrow (round send button), photos and paste (dock).
export function UpIcon({ size = tokens.layout.iconSize, color }: Props) {
  const ink = useInk(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
    </Svg>
  );
}

export function PhotoIcon({ size = tokens.layout.iconSize, color }: Props) {
  const ink = useInk(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 4.5h11A3.5 3.5 0 0 1 21 8v8a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 3 16V8a3.5 3.5 0 0 1 3.5-3.5Z" />
      <Circle cx={9} cy={10} r={1.6} />
      <Path d="m3.5 17 5-4.5 4 3.5 3-2.5 5 4" />
    </Svg>
  );
}

export function PasteIcon({ size = tokens.layout.iconSize, color }: Props) {
  const ink = useInk(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 4.5H7A2.5 2.5 0 0 0 4.5 7v11.5A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5V7A2.5 2.5 0 0 0 17 4.5h-1" />
      <Path d="M9 3h6v3H9zM9 11h6M9 15h4" />
    </Svg>
  );
}
