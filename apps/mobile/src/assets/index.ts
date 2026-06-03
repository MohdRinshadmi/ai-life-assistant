/**
 * Static asset registry.
 *
 * Centralise `require()`d images and fonts here so screens import a typed
 * reference (`images.logo`) instead of scattering brittle relative
 * `require('../../assets/...')` paths through the codebase.
 *
 * Example:
 *   import { images } from '@assets';
 *   <Image source={images.logo} />
 *
 * Populate as assets are added, e.g.:
 *   export const images = {
 *     logo: require('./images/logo.png'),
 *   } as const;
 */
export const images = {} as const;

export const fonts = {} as const;
