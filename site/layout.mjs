/* <head> shared by every page below the site root (how-it-works, the icon pages). Asset paths are root-absolute so they
   resolve from any depth. The home page keeps its own head (it also carries the site-wide JSON-LD). */
export const SITE = 'https://matita.dev/';

const OG_ALT = 'Matita: ruled by the grid, sketched by code. 200+ pencil-style icons for the web.';

export function pageHead({ esc, url, title, description, ogTitle, ogType = 'website', jsonLd, script, ogImage = SITE + 'og.png', ogImageAlt = OG_ALT }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="Matita">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ogImageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${url}">
<script type="application/ld+json">${jsonLd}</script>
<meta name="theme-color" content="#F6F4EE">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/geist-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/geist-mono-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/site.css">
<script>document.documentElement.className+=' js'</script>
<script src="/${script}" defer></script>
</head>`;
}
