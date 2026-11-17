import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText, Card } from '@/components';
import { bodyMapOf, type BodyMeasurement, type BodyPart, type MapSpot } from '@/domain';
import { formatNumber, lengthIn, useFormat } from '@/format';
import { useLanguage } from '@/i18n';
import { useBodyParts } from '@/records';
import { radii, spacing, useForeground, useTheme, useTone } from '@/theme';

/** The figure of Record's body map, drawn in a box of 200 by 380. */
const VIEW_WIDTH = 200;
const VIEW_HEIGHT = 380;
const HEAD = 'M100,10 c12,0 16,8 16,18 c0,12 -6,18 -16,18 c-10,0 -16,-6 -16,-18 c0,-10 4,-18 16,-18 Z';
const FIGURE =
  'M90,45 C75,45 55,55 45,75 C40,90 30,150 25,185 C23,205 45,205 45,185 C45,150 55,110 65,95 C70,120 75,150 70,190 ' +
  'C65,220 60,280 65,340 C65,360 85,360 85,340 C85,280 95,250 95,230 C97,215 103,215 105,230 C105,250 115,280 115,340 ' +
  'C115,360 135,360 135,340 C140,280 135,220 130,190 C125,150 130,120 135,95 C145,110 155,150 155,185 C155,205 177,205 ' +
  '175,185 C170,150 160,90 155,75 C145,55 125,45 110,45 Z';

/** Where Record puts the value of each part, as shares of the drawing's width and height. */
const SPOTS: Record<BodyPart, { x: number; y: number }> = {
  neck: { x: 0.5, y: 0.12 },
  shoulders: { x: 0.25, y: 0.18 },
  chest: { x: 0.5, y: 0.26 },
  bicep: { x: 0.22, y: 0.34 },
  waist: { x: 0.5, y: 0.45 },
  forearm: { x: 0.17, y: 0.46 },
  thigh: { x: 0.38, y: 0.64 },
  calf: { x: 0.37, y: 0.82 },
};

/** As wide as in Record at most, so the figure does not fill the whole card. */
const MAX_WIDTH = 220;
const MARK_WIDTH = 60;
const MARK_HEIGHT = 36;
/** A change smaller than half a millimetre is no change. */
const NO_CHANGE = 0.05;

export type BodyMapCardProps = {
  measurements: readonly BodyMeasurement[];
};

/**
 * Record's body map: a figure with the latest measurement of every part where it is taken, and
 * an arrow with the change since the part was measured before.
 */
export function BodyMapCard({ measurements }: BodyMapCardProps) {
  const { t } = useTranslation();
  const foreground = useForeground();
  const format = useFormat();
  const [width, setWidth] = useState(0);

  const spots = bodyMapOf(measurements);
  if (spots.length === 0) return null;

  const drawn = Math.min(width, MAX_WIDTH);
  const height = (drawn * VIEW_HEIGHT) / VIEW_WIDTH;

  return (
    <Card>
      <AppText variant="heading">{t('body.map')}</AppText>
      <AppText color="muted" variant="label">
        {t('body.mapCaption', { unit: format.lengthUnit })}
      </AppText>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.area} testID="body-map">
        {drawn > 0 ? (
          <View style={{ width: drawn, height }}>
            <Svg height={height} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} width={drawn}>
              <Path d={HEAD} fill={foreground.accent} fillOpacity={0.15} stroke={foreground.accent} strokeLinejoin="round" strokeWidth={2.5} />
              <Path d={FIGURE} fill={foreground.accent} fillOpacity={0.1} stroke={foreground.accent} strokeLinejoin="round" strokeWidth={2.5} />
            </Svg>
            {spots.map((spot) => (
              <Mark
                key={spot.part}
                left={SPOTS[spot.part].x * drawn - MARK_WIDTH / 2}
                spot={spot}
                top={SPOTS[spot.part].y * height - MARK_HEIGHT / 2}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

type MarkProps = { spot: MapSpot; left: number; top: number };

/** The value of one part on the figure, with its change underneath. */
function Mark({ spot, left, top }: MarkProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const tone = useTone();
  const foreground = useForeground();
  const format = useFormat();
  const { nameOf } = useBodyParts();

  const short = (cm: number) => formatNumber(lengthIn(cm, format.units.length), language, 1);
  const part = nameOf(spot.part);
  const value = format.length(spot.cm);
  const change = spot.change !== null && Math.abs(spot.change) >= NO_CHANGE ? spot.change : null;
  // Read out as the list of measurements reads it, with the change when there is one.
  const spoken =
    change === null
      ? `${part}: ${value}`
      : t(change > 0 ? 'body.mapSpotUp' : 'body.mapSpotDown', { part, value, change: format.length(Math.abs(change)) });

  return (
    <View
      accessibilityLabel={spoken}
      accessible
      style={[
        styles.mark,
        { left, top, borderColor: foreground.accent, backgroundColor: tone === 'backdrop' ? theme.card.background : theme[tone].background },
      ]}
    >
      <AppText strong variant="caption">
        {short(spot.cm)}
      </AppText>
      {change !== null ? (
        <AppText color="muted" style={styles.change} variant="caption">
          {`${change > 0 ? '▲' : '▼'}${short(Math.abs(change))}`}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    alignItems: 'center',
  },
  mark: {
    position: 'absolute',
    width: MARK_WIDTH,
    minHeight: MARK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
  },
  change: {
    fontSize: 10,
    lineHeight: 12,
  },
});
