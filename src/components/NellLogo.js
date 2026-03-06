import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export default function NellLogo({ color = '#FFFFFF', accentColor = '#d9549e', height = 28, style }) {
  const aspectRatio = 442.96 / 119.43;
  const width = height * aspectRatio;

  return (
    <Svg
      viewBox="0 0 442.96 119.43"
      width={width}
      height={height}
      style={style}
    >
      <Path
        d="M.81,0h44.89l28.29,34.9V0h21.51v55.73H24.19v63.7H.81V0ZM30.97,62.17h71.32V0h21.68v119.43h-41.5l-27.95-34.73v34.73h-23.55v-57.26Z"
        fill={color}
      />
      <Path
        d="M247.64,0h52.68v68.95h-52.68V0ZM247.64,75.38h91.31v44.04h-91.31v-44.04Z"
        fill={color}
      />
      <Path
        d="M351.65,0h52.68v68.95h-52.68V0ZM351.65,75.38h91.31v44.04h-91.31v-44.04Z"
        fill={color}
      />
      <Rect x="139.22" y="0" width="93" height="36.25" fill={color} />
      <Rect x="139.22" y="83.18" width="93" height="36.25" fill={color} />
      <Rect x="139.22" y="43.09" width="84.71" height="33.57" fill={accentColor} />
    </Svg>
  );
}
