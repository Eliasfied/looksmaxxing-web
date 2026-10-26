import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'marketing', 'public');

// One lookup per file across the whole build: 120 articles reference the same
// few hundred pictures, and several pages share one.
const cache = new Map();

async function dimensions(src) {
  if (cache.has(src)) return cache.get(src);
  let size = null;
  try {
    const file = path.join(PUBLIC_DIR, src);
    // Keep the lookup inside public/: a crafted src must not read elsewhere.
    if (file.startsWith(PUBLIC_DIR + path.sep) && fs.existsSync(file)) {
      const { default: sharp } = await import('sharp');
      const meta = await sharp(file).metadata();
      if (meta.width && meta.height) size = { width: meta.width, height: meta.height };
    }
  } catch {
    // An unreadable image is not worth failing a build over; it keeps the
    // behaviour it has today, which is no attributes.
  }
  cache.set(src, size);
  return size;
}

/**
 * Stamp intrinsic width and height onto images written as Markdown.
 *
 * Hero images get their dimensions from the Astro template, but a picture
 * placed in the article body renders as a bare <img>. The browser then cannot
 * reserve space for it, so the text below jumps down when it finally loads.
 * That jump is what Cumulative Layout Shift measures, and it lands in the
 * middle of the paragraph someone is reading.
 *
 * The attributes describe the file, not the layout: Tailwind's preflight keeps
 * `img { max-width: 100%; height: auto }`, so CSS still decides how large the
 * picture is drawn and the attributes only supply the aspect ratio.
 *
 * Sizes are read from the files rather than assumed. The pipeline currently
 * writes every illustration at 1024x1024, but a wrong attribute reserves the
 * wrong amount of space and shifts the page more than no attribute at all.
 */
export default function rehypeImageSize() {
  return async (tree) => {
    const pending = [];
    const visit = (node) => {
      if (node.tagName === 'img') {
        const props = node.properties ?? (node.properties = {});
        const src = typeof props.src === 'string' ? props.src : '';
        if (src.startsWith('/') && !src.startsWith('//') && !props.width && !props.height) {
          pending.push(
            dimensions(src).then((size) => {
              if (!size) return;
              props.width = size.width;
              props.height = size.height;
              // Below the fold in the article body, so it never competes with
              // the hero image for bandwidth.
              props.loading ??= 'lazy';
              props.decoding ??= 'async';
            })
          );
        }
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
    await Promise.all(pending);
  };
}
