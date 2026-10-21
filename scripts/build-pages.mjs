import { scssPlugin } from './lib/scss.mjs';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/lib/site.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'pages-dist');
if (path.relative(root, destination) !== 'pages-dist')
  throw Error('Invalid preview output directory');
await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(destination, { recursive: true });
const result = await build({
  absWorkingDir: root,
  entryPoints: ['preview/main.jsx'],
  entryNames: '[name]-[hash]',
  outdir: destination,
  bundle: true,
  minify: true,
  jsx: 'automatic',
  platform: 'browser',
  format: 'esm',
  target: ['es2022'],
  metafile: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: {
    'next/link': path.join(root, 'preview/router.jsx'),
    'next/navigation': path.join(root, 'preview/router.jsx'),
  },
  plugins: [
    scssPlugin({ rewriteAssets: true }),
    {
      name: 'pages-preview',
      setup(plugin) {
        plugin.onResolve({ filter: /CommunityProvider$/ }, () => ({
          path: path.join(root, 'preview/provider.jsx'),
        }));
        plugin.onResolve({ filter: /^\.\/(?:images|fonts)\// }, ({ path: asset }) => ({
          path: asset,
          external: true,
        }));
        plugin.onLoad({ filter: /\.(jsx|js|css)$/ }, async ({ path: filename }) => {
          if (!filename.startsWith(path.join(root, 'src'))) return;
          let contents = await fs.readFile(filename, 'utf8');
          contents = contents.replace(/(["'])\/(images|fonts)\//g, '$1./$2/');
          if (filename.endsWith('Shell.jsx'))
            contents = contents.replace(
              'src={previewRoute}',
              'src={`${location.pathname}${previewSkeleton?"?skeleton=1":""}#${previewRoute}`}',
            );
          return { contents, loader: filename.endsWith('.css') ? 'css' : 'jsx' };
        });
      },
    },
  ],
});
if (
  Object.keys(result.metafile.inputs).some((filename) =>
    filename.replaceAll('\\', '/').includes('src/lib/server/'),
  )
)
  throw Error('Server code must not be published to Pages');
await fs.cp(path.join(root, 'public/images'), path.join(destination, 'images'), {
  recursive: true,
});
await fs.cp(path.join(root, 'public/fonts'), path.join(destination, 'fonts'), { recursive: true });
const [script, details] = Object.entries(result.metafile.outputs).find(
  ([filename, output]) => filename.endsWith('.js') && output.entryPoint === 'preview/main.jsx',
);
const escape = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
const socialTags = {
  description: site.description,
  'og:type': 'website',
  'og:locale': 'ko_KR',
  'og:site_name': site.title,
  'og:title': site.title,
  'og:description': site.description,
  'og:url': site.url,
  'og:image': new URL(site.image, site.url).href,
  'og:image:width': site.imageWidth,
  'og:image:height': site.imageHeight,
  'og:image:alt': site.imageAlt,
  'twitter:card': 'summary_large_image',
  'twitter:title': site.title,
  'twitter:description': site.description,
  'twitter:image': new URL(site.image, site.url).href,
  'twitter:image:alt': site.imageAlt,
};
const meta = Object.entries(socialTags)
  .map(
    ([key, value]) =>
      `<meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escape(value)}">`,
  )
  .join('');
await fs.writeFile(
  path.join(destination, 'index.html'),
  `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(site.title)}</title>${meta}<link rel="canonical" href="${escape(site.url)}"><link rel="stylesheet" href="./${path.basename(details.cssBundle)}"></head><body><div id="root"></div><script type="module" src="./${path.basename(script)}"></script></body></html>`,
);
await fs.writeFile(path.join(destination, '.nojekyll'), '');
console.log('Read-only Pages preview built in pages-dist. Server code and live data excluded.');
