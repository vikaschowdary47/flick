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

// Redesign v2 line icons (same paths as the mockup's symbols).
function Line({ size, color, width = 1.8, d }: { size: number; color: string; width?: number; d: string[] }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {d.map((path) => (
        <Path key={path} d={path} />
      ))}
    </Svg>
  );
}
export function LaptopIcon({ size = 13, color }: Props) {
  return <Line size={size} color={useInk(color)} width={2} d={["M6 5h12a1.5 1.5 0 0 1 1.5 1.5v9h-15v-9A1.5 1.5 0 0 1 6 5Z", "M2.5 19h19"]} />;
}
export function PhoneIcon({ size = 13, color }: Props) {
  return <Line size={size} color={useInk(color)} width={2} d={["M9.6 2.5h4.8A2.6 2.6 0 0 1 17 5.1v13.8a2.6 2.6 0 0 1-2.6 2.6H9.6A2.6 2.6 0 0 1 7 18.9V5.1a2.6 2.6 0 0 1 2.6-2.6Z", "M11 18.5h2"]} />;
}
export function CopyIcon({ size = 19, color }: Props) {
  return <Line size={size} color={useInk(color)} d={["M11 8.5h6.5A2.5 2.5 0 0 1 20 11v6.5a2.5 2.5 0 0 1-2.5 2.5H11a2.5 2.5 0 0 1-2.5-2.5V11A2.5 2.5 0 0 1 11 8.5Z", "M15.5 8.5V6.5A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2"]} />;
}
export function ShareUpIcon({ size = 19, color }: Props) {
  return <Line size={size} color={useInk(color)} d={["M12 15V3.5M7.5 8 12 3.5 16.5 8", "M8 11H6.5A2.5 2.5 0 0 0 4 13.5v5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-5a2.5 2.5 0 0 0-2.5-2.5H16"]} />;
}
export function DownloadIcon({ size = 19, color }: Props) {
  return <Line size={size} color={useInk(color)} d={["M12 3.5V15M7.5 10.5 12 15l4.5-4.5", "M4 15.5v3A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-3"]} />;
}
export function ChevronIcon({ size = 16, color }: Props) {
  return <Line size={size} color={useInk(color)} d={["m9 5.5 6.5 6.5L9 18.5"]} />;
}
export function TypeIcon({ size = 16, color }: Props) {
  return <Line size={size} color={useInk(color)} width={2.1} d={["M5 6.5V5h14v1.5M12 5v14M9.5 19h5"]} />;
}
export function MoonIcon({ size = 16, color }: Props) {
  return <Line size={size} color={useInk(color)} width={2.1} d={["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"]} />;
}
export function WidgetIcon({ size = 16, color }: Props) {
  return <Line size={size} color={useInk(color)} width={2.1} d={["M6 4h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM15 4h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM6 13h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2Z"]} />;
}
export function LockIcon({ size = 16, color }: Props) {
  return <Line size={size} color={useInk(color)} width={2.1} d={["M7.5 10.5h9A2.5 2.5 0 0 1 19 13v5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18v-5a2.5 2.5 0 0 1 2.5-2.5Z", "M8 10.5V8a4 4 0 1 1 8 0v2.5"]} />;
}
export function BellIcon({ size = 16, color }: Props) {
  return <Line size={size} color={useInk(color)} width={2.1} d={["M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z", "M10 20a2 2 0 0 0 4 0"]} />;
}
export function ClipIcon({ size = 16, color }: Props) {
  return <Line size={size} color={useInk(color)} d={["M8 4.5h8A2.5 2.5 0 0 1 18.5 7v11a2.5 2.5 0 0 1-2.5 2.5H8A2.5 2.5 0 0 1 5.5 18V7A2.5 2.5 0 0 1 8 4.5Z", "M9 4.5V3.8c0-.7.5-1.3 1.2-1.3h3.6c.7 0 1.2.6 1.2 1.3v.7M9 10h6M9 14h4"]} />;
}
export function DensityIcon({ size = 16, color }: Props) {
  return <Line size={size} color={useInk(color)} width={2.1} d={["M5 6h14M5 12h14M5 18h14"]} />;
}
export function DevicesIcon({ size = 16, color }: Props) {
  return <Line size={size} color={useInk(color)} width={2.1} d={["M4 6.5h10a1.5 1.5 0 0 1 1.5 1.5v6.5h-13V8A1.5 1.5 0 0 1 4 6.5Z", "M1 18h15M18.5 9h2.5a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"]} />;
}
export function BroomIcon({ size = 16, color }: Props) {
  return <Line size={size} color={useInk(color)} width={2.1} d={["M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13"]} />;
}

// The amber app mark (same drawing as the app icon), for headers and empty states.
export function AppMark({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M7.5 0h17A7.5 7.5 0 0 1 32 7.5v17a7.5 7.5 0 0 1-7.5 7.5h-17A7.5 7.5 0 0 1 0 24.5v-17A7.5 7.5 0 0 1 7.5 0Z" fill="#F5B83D" />
      <Path d="M10.25 6.5h11.5a2.25 2.25 0 0 1 0 4.5h-11.5a2.25 2.25 0 0 1 0-4.5Z" fill="#2B2210" />
      <Path d="M9.5 15h13L16 24Z" fill="#2B2210" stroke="#2B2210" strokeWidth={3} strokeLinejoin="round" />
    </Svg>
  );
}
