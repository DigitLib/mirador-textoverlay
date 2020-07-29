import flatten from 'lodash/flatten';
import zip from 'lodash/zip';

/**
 * Change alpha/opacity of a color.
 *
 * Input can be an RGB color as a hex string or in `rgba(...)` form.
 *
 * Based on https://gist.github.com/danieliser/b4b24c9f772066bcf0a6
 */
export const changeAlpha = (color, opacity) => {
  if (color[0] === '#') {
    let hex = color.replace('#', '');
    if (hex.length === 3) {
      hex = flatten(zip(Array.from(hex), Array.from(hex))).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  if (color.startsWith('rgba')) {
    return color.replace(/[^,]+(?=\))/, opacity);
  }
  if (color.startsWith('rgb')) {
    return color.replace(/^rgb/, 'rgba').replace(/\)$/, `, ${opacity})`);
  }
  console.error(`Unsupported color: ${color}`);
  return color;
};

/** Convert a rgb(...) or rgba(...) string to its hexadecimal representation. */
export function toHexRgb(rgbColor) {
  if (!rgbColor || !rgbColor.startsWith('rgb')) {
    return rgbColor;
  }
  // eslint-disable-next-line prefer-template
  return '#' + rgbColor.replace(/rgba?\((.+)\)/, '$1')
    .split(',').slice(0, 3)
    .map((x) => x.trim())
    .map((x) => Number.parseInt(x, 10))
    .map((x) => x.toString(16))
    .join('');
}

/** Load image data for image */
async function loadImage(imgUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height).data);
    };
    img.onerror = reject;
    img.src = imgUrl;
  });
}

/** Determine foreground and background color from text image. */
export async function getLineColors(imageService) {
  // FIXME: This assumes a Level 2 endpoint, we should probably use one of the sizes listed
  //        explicitely in the info response instead.
  const imgUrl = `${imageService}/full/200,/0/default.jpg`;
  const data = await loadImage(imgUrl);
  const colors = {};
  // Data is a flat array containing the image pixels as uint8 RGBA values in the range [0, 255]
  for (let i = 0; i < data.length - 3; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const rgb = `rgb(${r},${g},${b})`;
    colors[rgb] = (colors[rgb] ?? 0) + 1;
  }
  // Really simple algorithm: The most frequent color is always going to be the text color,
  // the next most frequent color is the background. This can and should probably be tweaked
  // with some heuristics in the future (converting to HSL seems worthwhile), but it's good
  // enough for now.
  const [textColor, bgColor] = Object.entries(colors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k, v]) => k);
  return { textColor, bgColor };
}
