import * as sass from 'sass';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// esbuild does not compile SCSS itself. Share the same Sass compiler used by Next.js.
export function scssPlugin({ rewriteAssets = false } = {}) {
  return {
    name: 'community-scss',
    setup(build) {
      build.onLoad({ filter: /\.scss$/ }, async ({ path }) => {
        const result = await sass.compileAsync(path, { style: 'expanded' });
        const contents = rewriteAssets
          ? result.css.replace(/(["'])\/(images|fonts)\//g, '$1./$2/')
          : result.css;
        return {
          contents,
          loader: 'css',
          resolveDir: dirname(path),
          watchFiles: result.loadedUrls
            .filter((url) => url.protocol === 'file:')
            .map(fileURLToPath),
        };
      });
    },
  };
}
