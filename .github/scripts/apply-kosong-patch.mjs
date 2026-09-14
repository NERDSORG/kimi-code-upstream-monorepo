/**
 * @fileoverview Idempotent patch for the kosong mirror branch.
 *
 * Why this exists: packages/kosong/package.json declares "files": ["dist"],
 * but its "exports" map points directly at the TypeScript sources in src/.
 * pnpm (>= 9) applies the "files" allowlist when packing git-hosted
 * dependencies, so `pnpm add github:<owner>/kimi-code#<ref>&path:packages/kosong`
 * arrives with src/ stripped and the package is unusable. Removing the
 * "files" field keeps the full tree on install.
 *
 * The script is content-based (JSON field deletion), not a context diff, so
 * unrelated upstream changes cannot break it. Layout assertions below make
 * the workflow fail loudly if upstream ever restructures the package,
 * instead of silently shipping a broken mirror.
 *
 * Usage: node .github/scripts/apply-kosong-patch.mjs
 * Exit code is always 0 unless the layout assertions fail.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const PKG = 'packages/kosong/package.json';
const manifest = JSON.parse(readFileSync(PKG, 'utf8'));

// Fail loudly if upstream restructures: better a red workflow run than a
// mirror that consumers install successfully but find empty.
if (!manifest.exports?.['.']?.default?.startsWith('./src/')) {
    throw new Error(
        '[kosong-patch] kosong "exports" no longer point into ./src/ — ' +
        'upstream changed the package layout; review this patch manually.'
    );
}
if (!existsSync('packages/kosong/src/index.ts')) {
    throw new Error(
        '[kosong-patch] packages/kosong/src/index.ts is missing — ' +
        'upstream changed the package layout; review this patch manually.'
    );
}

if (!('files' in manifest)) {
    console.log('[kosong-patch] "files" field already absent — nothing to do.');
    process.exit(0);
}

delete manifest.files;
writeFileSync(PKG, JSON.stringify(manifest, null, 2) + '\n');
console.log('[kosong-patch] Removed "files" field from', PKG);
