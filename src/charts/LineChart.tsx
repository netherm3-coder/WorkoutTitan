import { useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { AppText } from '@/components';
import { spacing, useForeground } from '@/theme';

import { geometryOf, type ChartPoint, type ScaleOptions } from './geometry';

const HEIGHT = 160;
/** Width of the column with the scale values. */
const GUTTER = 52;
/** Past this many points the dots crowd the line, and only the latest keeps its dot. */
const MAX_DOTS = 40;

export type LineChartProps = ScaleOptions & {
  points: readonly ChartPoint[];
  /** A value of the scale, short: "15", "82,5", "24:30". The unit stands above the chart. */
  formatValue: (value: number) => string;
  /** The days of the first and the last point, under the chart. */
  startLabel: string;
  endLabel: string;
  /** What the chart shows, read out by screen readers in place of the drawing. */
  summary: string;
};

/**
 * A line through values over time, shaded underneath, in the colours of the card it sits on.
 * As in Record: a line with its points, three scale lines and the first and the last day.
 */
export function LineChart({ points, formatValue, startLabel, endLabel, summary, ...scale }: LineChartProps) {
  const foreground = useForeground();
  const [width, setWidth] = useState(0);
  const shade = `shade${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const geometry = width > 0 ? geometryOf(points, width, HEIGHT, scale) : null;
  const latest = geometry?.dots[geometry.dots.length - 1];

  return (
    <View accessibilityLabel={summary} accessibilityRole="image" accessible>
      <View style={styles.row}>
        <View style={styles.gutter}>
          {geometry?.levels.map((level) => (
            <AppText
              adjustsFontSizeToFit
              color="muted"
              key={level.y}
              numberOfLines={1}
              style={[styles.level, { top: level.y - 8 }]}
              variant="caption"
            >
              {formatValue(level.value)}
            </AppText>
          ))}
        </View>
        <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.plot} testID="chart-plot">
          {geometry ? (
            <Svg height={HEIGHT} width={width}>
              <Defs>
                <LinearGradient id={shade} x1="0" x2="0" y1="0" y2="1">
                  <Stop offset="0" stopColor={foreground.accent} stopOpacity={0.35} />
                  <Stop offset="1" stopColor={foreground.accent} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {geometry.levels.map((level) => (
                <Line
                  key={level.y}
                  stroke={foreground.muted}
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  strokeWidth={1}
                  x1={0}
                  x2={width}
                  y1={level.y}
                  y2={level.y}
                />
              ))}
              <Path d={geometry.area} fill={`url(#${shade})`} />
              <Path
                d={geometry.line}
                fill="none"
                stroke={foreground.accent}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
              />
              {geometry.dots.length <= MAX_DOTS
                ? geometry.dots.map((dot) => <Circle cx={dot.cx} cy={dot.cy} fill={foreground.accent} key={dot.cx} r={3.5} />)
                : null}
              {latest ? <Circle cx={latest.cx} cy={latest.cy} fill={foreground.accent} r={5.5} /> : null}
            </Svg>
          ) : null}
        </View>
      </View>
      <View style={styles.days}>
        <AppText color="muted" variant="caption">
          {startLabel}
        </AppText>
        <AppText color="muted" variant="caption">
          {endLabel}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    height: HEIGHT,
  },
  gutter: {
    width: GUTTER,
  },
  level: {
    position: 'absolute',
    left: 0,
    right: spacing.sm,
    textAlign: 'right',
  },
  plot: {
    flex: 1,
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: GUTTER,
    marginTop: spacing.xs,
  },
});
