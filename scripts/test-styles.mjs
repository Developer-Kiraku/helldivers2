import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import * as sass from 'sass';

const tokenPrefix =
  /^--hd-(?:color|size|space|font-size|radius|duration|weight|leading|layer|opacity|font)-/;
const tokens = new Map();
const globalCss = sass.compile('src/app/globals.scss').css;
postcss.parse(globalCss).walkDecls((declaration) => {
  if (tokenPrefix.test(declaration.prop)) tokens.set(declaration.prop, declaration.value);
});
assert.ok(tokens.size > 0, 'The global stylesheet must emit the design tokens.');

async function stylesIn(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const filename = path.join(directory, entry.name);
      return entry.isDirectory()
        ? stylesIn(filename)
        : /\.(scss|css)$/.test(filename)
          ? [filename]
          : [];
    }),
  );
  return nested.flat();
}

const sources = [...(await stylesIn('src')), ...(await stylesIn('preview'))];
assert.ok(
  sources.every((filename) => filename.endsWith('.scss')),
  'Owned styles must use SCSS.',
);
const entries = sources.filter((filename) => !path.basename(filename).startsWith('_'));
for (const filename of entries) {
  const css = postcss.parse(sass.compile(filename).css);
  css.walkDecls((declaration) => {
    assert.ok(
      !/^--(?:color|size|space|font-size|radius|duration|weight|leading|layer|opacity|font)-/.test(
        declaration.prop,
      ),
      `${filename}: design tokens need the --hd- namespace to avoid library collisions`,
    );
    for (const [, name] of declaration.value.matchAll(/var\((--[\w-]+)/g)) {
      if (tokenPrefix.test(name))
        assert.ok(tokens.has(name), `${filename}: undefined token ${name}`);
    }
  });
  css.walkAtRules('media', (rule) => {
    assert.ok(!rule.params.includes('var('), `${filename}: media queries require Sass breakpoints`);
  });
}
// Keep literal design values in the central map; font-face descriptors are CSS constants.
for (const filename of sources.filter((filename) => !filename.endsWith('_tokens.scss'))) {
  const source = await fs.readFile(filename, 'utf8');
  assert.ok(!/#[\da-f]{3,8}\b/i.test(source), `${filename}: move color values to _tokens.scss`);
  assert.ok(!/font-size\s*:\s*[\d.]+px/.test(source), `${filename}: use a font-size token`);
}
console.log(
  `PASS: ${entries.length} SCSS entry points, ${tokens.size} defined tokens, valid references and Sass breakpoints; no owned CSS files or scattered color/font-size literals`,
);
