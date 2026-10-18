import Svg, { Circle, Path } from "react-native-svg";
import { tokens } from "../design/tokens";

type Props = { size?: number; color?: string };

// Same paths as the desktop widget's preview and remove icons.
export function EyeIcon({ size = tokens.layout.iconSize, color = tokens.colors.navy }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <Circle cx={12} cy={12} r={2.7} />
    </Svg>
  );
}

export function CloseIcon({ size = tokens.layout.iconSize, color = tokens.colors.navy }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
      <Path d="m6 6 12 12M18 6 6 18" />
    </Svg>
  );
}
