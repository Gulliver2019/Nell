import React from 'react';
import Svg, { Text as SvgText, Path, Defs, Style } from 'react-native-svg';

export default function GoalDiggerLogo({ color = '#FFFFFF', height = 28, style }) {
  // Original viewBox: 0 0 1149.87 255.74
  const aspectRatio = 1149.87 / 255.74;
  const width = height * aspectRatio;

  return (
    <Svg
      viewBox="0 0 1149.87 255.74"
      width={width}
      height={height}
      style={style}
    >
      <SvgText
        fontFamily="Impact, Impact"
        fontSize="231.2"
        fill={color}
        x="9"
        y="190.27"
      >
        GoalDigger
      </SvgText>
      <Path
        d="M1105.95,216.12c-3.06,3.9-47.6,7.35-56.28,7.23,0,0,0,0,0,0,0,0,0,0-.01,0h-25.93v-14.38h25.93s0,0,.01,0c0,0,0,0,0,0,8.98-.13,53.36,3.19,56.28,7.16ZM864.45,216.07c0-3.92,2.35-7.11,5.24-7.11h151.58s0,14.38,0,14.38h-151.58c-2.89,0-5.24-3.19-5.24-7.28ZM1087.21,176.59c40.89,0,59.73,33.78,62.65,39.57-2.93,5.78-21.81,39.57-62.65,39.57h-32.66c-.67,0-1.23-.55-1.23-1.23v-27.49c0-.47-.1-.91-.26-1.32,12.18-.51,49.99-3.09,54.66-7.93.59-.61.72-1.22.72-1.65,0-.04,0-.07,0-.1-.33-6.54-42.9-8.86-55.39-9.39.17-.42.26-.87.26-1.35v-27.47c0-.68.55-1.23,1.23-1.23h32.66ZM0,219.92c0-3.92,9.29-7.11,20.72-7.11h599.3v14.38s-599.3,0-599.3,0c-11.43,0-20.72-3.19-20.72-7.28Z"
        fill={color}
      />
    </Svg>
  );
}
