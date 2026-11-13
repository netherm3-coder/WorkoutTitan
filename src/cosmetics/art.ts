/*
 * Written by scripts/build-scene-art.py together with the files in assets/scene.
 * Do not edit by hand: change the script and run it again.
 */
import type { ImageSourcePropType } from 'react-native';

import type { Colour, Hat, Pattern, Season, Sky, Tent } from '@/domain';

type Pictures<Key extends string> = Record<Key, ImageSourcePropType>;

/** The fire in front of everything; it is the same in every look. */
export const CAMPFIRE: ImageSourcePropType = require('@/assets/scene/campfire.gif');

/** The sky and the ground under it. */
export const SKY_ART = {
  sunny: {
    bare: require('@/assets/scene/sky/sunny-bare.webp'),
    summer: require('@/assets/scene/sky/sunny-summer.webp'),
    autumn: require('@/assets/scene/sky/sunny-autumn.webp'),
    cherry: require('@/assets/scene/sky/sunny-cherry.webp'),
    winter: require('@/assets/scene/sky/sunny-winter.webp'),
  },
  cloudy: {
    bare: require('@/assets/scene/sky/cloudy-bare.webp'),
    summer: require('@/assets/scene/sky/cloudy-summer.webp'),
    autumn: require('@/assets/scene/sky/cloudy-autumn.webp'),
    cherry: require('@/assets/scene/sky/cloudy-cherry.webp'),
    winter: require('@/assets/scene/sky/cloudy-winter.webp'),
  },
  rain: {
    bare: require('@/assets/scene/sky/rain-bare.webp'),
    summer: require('@/assets/scene/sky/rain-summer.webp'),
    autumn: require('@/assets/scene/sky/rain-autumn.webp'),
    cherry: require('@/assets/scene/sky/rain-cherry.webp'),
    winter: require('@/assets/scene/sky/rain-winter.webp'),
  },
  sunset: {
    bare: require('@/assets/scene/sky/sunset-bare.webp'),
    summer: require('@/assets/scene/sky/sunset-summer.webp'),
    autumn: require('@/assets/scene/sky/sunset-autumn.webp'),
    cherry: require('@/assets/scene/sky/sunset-cherry.webp'),
    winter: require('@/assets/scene/sky/sunset-winter.webp'),
  },
  starry: {
    bare: require('@/assets/scene/sky/starry-bare.webp'),
    summer: require('@/assets/scene/sky/starry-summer.webp'),
    autumn: require('@/assets/scene/sky/starry-autumn.webp'),
    cherry: require('@/assets/scene/sky/starry-cherry.webp'),
    winter: require('@/assets/scene/sky/starry-winter.webp'),
  },
} satisfies Record<Sky, Pictures<Season>>;

/** The tent, the log and the two trees with their leaves. */
export const TENT_ART = {
  canvas: {
    bare: require('@/assets/scene/tent/canvas-bare.webp'),
    summer: require('@/assets/scene/tent/canvas-summer.webp'),
    autumn: require('@/assets/scene/tent/canvas-autumn.webp'),
    cherry: require('@/assets/scene/tent/canvas-cherry.webp'),
    winter: require('@/assets/scene/tent/canvas-winter.webp'),
  },
  gray: {
    bare: require('@/assets/scene/tent/gray-bare.webp'),
    summer: require('@/assets/scene/tent/gray-summer.webp'),
    autumn: require('@/assets/scene/tent/gray-autumn.webp'),
    cherry: require('@/assets/scene/tent/gray-cherry.webp'),
    winter: require('@/assets/scene/tent/gray-winter.webp'),
  },
  black: {
    bare: require('@/assets/scene/tent/black-bare.webp'),
    summer: require('@/assets/scene/tent/black-summer.webp'),
    autumn: require('@/assets/scene/tent/black-autumn.webp'),
    cherry: require('@/assets/scene/tent/black-cherry.webp'),
    winter: require('@/assets/scene/tent/black-winter.webp'),
  },
  blue: {
    bare: require('@/assets/scene/tent/blue-bare.webp'),
    summer: require('@/assets/scene/tent/blue-summer.webp'),
    autumn: require('@/assets/scene/tent/blue-autumn.webp'),
    cherry: require('@/assets/scene/tent/blue-cherry.webp'),
    winter: require('@/assets/scene/tent/blue-winter.webp'),
  },
  brown: {
    bare: require('@/assets/scene/tent/brown-bare.webp'),
    summer: require('@/assets/scene/tent/brown-summer.webp'),
    autumn: require('@/assets/scene/tent/brown-autumn.webp'),
    cherry: require('@/assets/scene/tent/brown-cherry.webp'),
    winter: require('@/assets/scene/tent/brown-winter.webp'),
  },
  green: {
    bare: require('@/assets/scene/tent/green-bare.webp'),
    summer: require('@/assets/scene/tent/green-summer.webp'),
    autumn: require('@/assets/scene/tent/green-autumn.webp'),
    cherry: require('@/assets/scene/tent/green-cherry.webp'),
    winter: require('@/assets/scene/tent/green-winter.webp'),
  },
  lightBlue: {
    bare: require('@/assets/scene/tent/lightBlue-bare.webp'),
    summer: require('@/assets/scene/tent/lightBlue-summer.webp'),
    autumn: require('@/assets/scene/tent/lightBlue-autumn.webp'),
    cherry: require('@/assets/scene/tent/lightBlue-cherry.webp'),
    winter: require('@/assets/scene/tent/lightBlue-winter.webp'),
  },
  orange: {
    bare: require('@/assets/scene/tent/orange-bare.webp'),
    summer: require('@/assets/scene/tent/orange-summer.webp'),
    autumn: require('@/assets/scene/tent/orange-autumn.webp'),
    cherry: require('@/assets/scene/tent/orange-cherry.webp'),
    winter: require('@/assets/scene/tent/orange-winter.webp'),
  },
  pink: {
    bare: require('@/assets/scene/tent/pink-bare.webp'),
    summer: require('@/assets/scene/tent/pink-summer.webp'),
    autumn: require('@/assets/scene/tent/pink-autumn.webp'),
    cherry: require('@/assets/scene/tent/pink-cherry.webp'),
    winter: require('@/assets/scene/tent/pink-winter.webp'),
  },
  purple: {
    bare: require('@/assets/scene/tent/purple-bare.webp'),
    summer: require('@/assets/scene/tent/purple-summer.webp'),
    autumn: require('@/assets/scene/tent/purple-autumn.webp'),
    cherry: require('@/assets/scene/tent/purple-cherry.webp'),
    winter: require('@/assets/scene/tent/purple-winter.webp'),
  },
  red: {
    bare: require('@/assets/scene/tent/red-bare.webp'),
    summer: require('@/assets/scene/tent/red-summer.webp'),
    autumn: require('@/assets/scene/tent/red-autumn.webp'),
    cherry: require('@/assets/scene/tent/red-cherry.webp'),
    winter: require('@/assets/scene/tent/red-winter.webp'),
  },
  white: {
    bare: require('@/assets/scene/tent/white-bare.webp'),
    summer: require('@/assets/scene/tent/white-summer.webp'),
    autumn: require('@/assets/scene/tent/white-autumn.webp'),
    cherry: require('@/assets/scene/tent/white-cherry.webp'),
    winter: require('@/assets/scene/tent/white-winter.webp'),
  },
  yellow: {
    bare: require('@/assets/scene/tent/yellow-bare.webp'),
    summer: require('@/assets/scene/tent/yellow-summer.webp'),
    autumn: require('@/assets/scene/tent/yellow-autumn.webp'),
    cherry: require('@/assets/scene/tent/yellow-cherry.webp'),
    winter: require('@/assets/scene/tent/yellow-winter.webp'),
  },
} satisfies Record<Tent, Pictures<Season>>;

/** The print on the tent. */
export const PATTERN_ART = {
  dots: {
    gray: require('@/assets/scene/pattern/dots-gray.webp'),
    black: require('@/assets/scene/pattern/dots-black.webp'),
    blue: require('@/assets/scene/pattern/dots-blue.webp'),
    brown: require('@/assets/scene/pattern/dots-brown.webp'),
    green: require('@/assets/scene/pattern/dots-green.webp'),
    lightBlue: require('@/assets/scene/pattern/dots-lightBlue.webp'),
    orange: require('@/assets/scene/pattern/dots-orange.webp'),
    pink: require('@/assets/scene/pattern/dots-pink.webp'),
    purple: require('@/assets/scene/pattern/dots-purple.webp'),
    red: require('@/assets/scene/pattern/dots-red.webp'),
    white: require('@/assets/scene/pattern/dots-white.webp'),
    yellow: require('@/assets/scene/pattern/dots-yellow.webp'),
  },
  stripes: {
    gray: require('@/assets/scene/pattern/stripes-gray.webp'),
    black: require('@/assets/scene/pattern/stripes-black.webp'),
    blue: require('@/assets/scene/pattern/stripes-blue.webp'),
    brown: require('@/assets/scene/pattern/stripes-brown.webp'),
    green: require('@/assets/scene/pattern/stripes-green.webp'),
    lightBlue: require('@/assets/scene/pattern/stripes-lightBlue.webp'),
    orange: require('@/assets/scene/pattern/stripes-orange.webp'),
    pink: require('@/assets/scene/pattern/stripes-pink.webp'),
    purple: require('@/assets/scene/pattern/stripes-purple.webp'),
    red: require('@/assets/scene/pattern/stripes-red.webp'),
    white: require('@/assets/scene/pattern/stripes-white.webp'),
    yellow: require('@/assets/scene/pattern/stripes-yellow.webp'),
  },
  waves: {
    gray: require('@/assets/scene/pattern/waves-gray.webp'),
    black: require('@/assets/scene/pattern/waves-black.webp'),
    blue: require('@/assets/scene/pattern/waves-blue.webp'),
    brown: require('@/assets/scene/pattern/waves-brown.webp'),
    green: require('@/assets/scene/pattern/waves-green.webp'),
    lightBlue: require('@/assets/scene/pattern/waves-lightBlue.webp'),
    orange: require('@/assets/scene/pattern/waves-orange.webp'),
    pink: require('@/assets/scene/pattern/waves-pink.webp'),
    purple: require('@/assets/scene/pattern/waves-purple.webp'),
    red: require('@/assets/scene/pattern/waves-red.webp'),
    white: require('@/assets/scene/pattern/waves-white.webp'),
    yellow: require('@/assets/scene/pattern/waves-yellow.webp'),
  },
  flowers: {
    gray: require('@/assets/scene/pattern/flowers-gray.webp'),
    black: require('@/assets/scene/pattern/flowers-black.webp'),
    blue: require('@/assets/scene/pattern/flowers-blue.webp'),
    brown: require('@/assets/scene/pattern/flowers-brown.webp'),
    green: require('@/assets/scene/pattern/flowers-green.webp'),
    lightBlue: require('@/assets/scene/pattern/flowers-lightBlue.webp'),
    orange: require('@/assets/scene/pattern/flowers-orange.webp'),
    pink: require('@/assets/scene/pattern/flowers-pink.webp'),
    purple: require('@/assets/scene/pattern/flowers-purple.webp'),
    red: require('@/assets/scene/pattern/flowers-red.webp'),
    white: require('@/assets/scene/pattern/flowers-white.webp'),
    yellow: require('@/assets/scene/pattern/flowers-yellow.webp'),
  },
  stars: {
    gray: require('@/assets/scene/pattern/stars-gray.webp'),
    black: require('@/assets/scene/pattern/stars-black.webp'),
    blue: require('@/assets/scene/pattern/stars-blue.webp'),
    brown: require('@/assets/scene/pattern/stars-brown.webp'),
    green: require('@/assets/scene/pattern/stars-green.webp'),
    lightBlue: require('@/assets/scene/pattern/stars-lightBlue.webp'),
    orange: require('@/assets/scene/pattern/stars-orange.webp'),
    pink: require('@/assets/scene/pattern/stars-pink.webp'),
    purple: require('@/assets/scene/pattern/stars-purple.webp'),
    red: require('@/assets/scene/pattern/stars-red.webp'),
    white: require('@/assets/scene/pattern/stars-white.webp'),
    yellow: require('@/assets/scene/pattern/stars-yellow.webp'),
  },
  hearts: {
    gray: require('@/assets/scene/pattern/hearts-gray.webp'),
    black: require('@/assets/scene/pattern/hearts-black.webp'),
    blue: require('@/assets/scene/pattern/hearts-blue.webp'),
    brown: require('@/assets/scene/pattern/hearts-brown.webp'),
    green: require('@/assets/scene/pattern/hearts-green.webp'),
    lightBlue: require('@/assets/scene/pattern/hearts-lightBlue.webp'),
    orange: require('@/assets/scene/pattern/hearts-orange.webp'),
    pink: require('@/assets/scene/pattern/hearts-pink.webp'),
    purple: require('@/assets/scene/pattern/hearts-purple.webp'),
    red: require('@/assets/scene/pattern/hearts-red.webp'),
    white: require('@/assets/scene/pattern/hearts-white.webp'),
    yellow: require('@/assets/scene/pattern/hearts-yellow.webp'),
  },
} satisfies Record<Pattern, Pictures<Colour>>;

/** The knight, animated, in each colour of armour. */
export const KNIGHT_ART = {
  gray: require('@/assets/scene/knight/gray.gif'),
  black: require('@/assets/scene/knight/black.gif'),
  blue: require('@/assets/scene/knight/blue.gif'),
  brown: require('@/assets/scene/knight/brown.gif'),
  green: require('@/assets/scene/knight/green.gif'),
  lightBlue: require('@/assets/scene/knight/lightBlue.gif'),
  orange: require('@/assets/scene/knight/orange.gif'),
  pink: require('@/assets/scene/knight/pink.gif'),
  purple: require('@/assets/scene/knight/purple.gif'),
  red: require('@/assets/scene/knight/red.gif'),
  white: require('@/assets/scene/knight/white.gif'),
  yellow: require('@/assets/scene/knight/yellow.gif'),
} satisfies Pictures<Colour>;

/** A hat as it sits on the knight. */
export const HAT_ART = {
  sprout: require('@/assets/scene/hat/sprout.webp'),
  beanie: require('@/assets/scene/hat/beanie.webp'),
  baseballCap: require('@/assets/scene/hat/baseballCap.webp'),
  beret: require('@/assets/scene/hat/beret.webp'),
  bucketHat: require('@/assets/scene/hat/bucketHat.webp'),
  cowboy: require('@/assets/scene/hat/cowboy.webp'),
  ushanka: require('@/assets/scene/hat/ushanka.webp'),
  raccoon: require('@/assets/scene/hat/raccoon.webp'),
  flowerCrown: require('@/assets/scene/hat/flowerCrown.webp'),
  partyHat: require('@/assets/scene/hat/partyHat.webp'),
  propeller: require('@/assets/scene/hat/propeller.webp'),
  paperBoat: require('@/assets/scene/hat/paperBoat.webp'),
  bucket: require('@/assets/scene/hat/bucket.webp'),
  pot: require('@/assets/scene/hat/pot.webp'),
  egg: require('@/assets/scene/hat/egg.webp'),
  crown: require('@/assets/scene/hat/crown.webp'),
  topHat: require('@/assets/scene/hat/topHat.webp'),
  headphones: require('@/assets/scene/hat/headphones.webp'),
  catEars: require('@/assets/scene/hat/catEars.webp'),
  duck: require('@/assets/scene/hat/duck.webp'),
} satisfies Pictures<Hat>;

/** A hat as a picture for the list: on the knight it is too small to tell apart. */
export const HAT_TILES = {
  sprout: require('@/assets/scene/hat-tile/sprout.webp'),
  beanie: require('@/assets/scene/hat-tile/beanie.webp'),
  baseballCap: require('@/assets/scene/hat-tile/baseballCap.webp'),
  beret: require('@/assets/scene/hat-tile/beret.webp'),
  bucketHat: require('@/assets/scene/hat-tile/bucketHat.webp'),
  cowboy: require('@/assets/scene/hat-tile/cowboy.webp'),
  ushanka: require('@/assets/scene/hat-tile/ushanka.webp'),
  raccoon: require('@/assets/scene/hat-tile/raccoon.webp'),
  flowerCrown: require('@/assets/scene/hat-tile/flowerCrown.webp'),
  partyHat: require('@/assets/scene/hat-tile/partyHat.webp'),
  propeller: require('@/assets/scene/hat-tile/propeller.webp'),
  paperBoat: require('@/assets/scene/hat-tile/paperBoat.webp'),
  bucket: require('@/assets/scene/hat-tile/bucket.webp'),
  pot: require('@/assets/scene/hat-tile/pot.webp'),
  egg: require('@/assets/scene/hat-tile/egg.webp'),
  crown: require('@/assets/scene/hat-tile/crown.webp'),
  topHat: require('@/assets/scene/hat-tile/topHat.webp'),
  headphones: require('@/assets/scene/hat-tile/headphones.webp'),
  catEars: require('@/assets/scene/hat-tile/catEars.webp'),
  duck: require('@/assets/scene/hat-tile/duck.webp'),
} satisfies Pictures<Hat>;
