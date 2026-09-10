'use client';

import { useEffect } from 'react';

/**
 * Boots the site's runtime in the original page's order:
 *   jQuery -> Webflow runtime -> hls.js -> the custom Three.js module bundle
 *   -> the small inline setup script.
 *
 * The Three.js bundle (app.module.js) is an ES module that enhances the existing
 * DOM by querySelector (.webgl canvas, scene-* spacers, [data-insight] ...) and
 * loads its GLB models from /models and Draco decoders from gstatic. The inline
 * script sets --vh and removes the preloader.
 */
const CLASSIC = [
  '/vendor/jquery.min.js',
  '/vendor/webflow.js',
  '/vendor/hls.min.js',
];

let started = false;

function loadScript(src: string, type?: string) {
  return new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    if (type) el.type = type;
    el.async = false; // preserve order
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`failed to load ${src}`));
    document.body.appendChild(el);
  });
}

export default function SiteScripts() {
  useEffect(() => {
    if (started) return;
    started = true;

    (async () => {
      for (const src of CLASSIC) await loadScript(src);
      // ES module: its relative imports/model URLs resolve from /assets & /models
      await loadScript('/assets/app.module.js', 'module');
      await loadScript('/vendor/inline.js');
    })().catch((e) => console.error('[sleepwell] script boot failed', e));
  }, []);

  return null;
}
