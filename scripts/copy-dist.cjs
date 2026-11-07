const fs = require('fs');
const path = require('path');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (
      entry.name === 'index.php' ||
      entry.name === '.htaccess' ||
      entry.name === 'storage'
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (err) {
        if (err.code === 'EPIPE' || err.code === 'EBUSY' || err.code === 'EPERM') {
          console.warn(`[copy-dist] Warning: Skipped locked file ${destPath} (${err.code})`);
        } else {
          throw err;
        }
      }
    }
  }
}

function cleanOrphanedAssets(distAssetsDir, publicAssetsDir) {
  if (!fs.existsSync(distAssetsDir) || !fs.existsSync(publicAssetsDir)) return;
  const distFiles = new Set(fs.readdirSync(distAssetsDir));
  const publicFiles = fs.readdirSync(publicAssetsDir);
  let cleaned = 0;
  for (const file of publicFiles) {
    if (!distFiles.has(file)) {
      try {
        fs.unlinkSync(path.join(publicAssetsDir, file));
        cleaned++;
      } catch (e) {
        // ignore locked files
      }
    }
  }
  if (cleaned > 0) {
    console.log(`✓ Cleaned ${cleaned} orphaned old assets from public/assets directory.`);
  }
}

try {
  cleanOrphanedAssets(path.join('dist', 'assets'), path.join('public', 'assets'));
  copyDirRecursive('dist', 'public');
  console.log('✓ Successfully copied dist assets to public directory.');
} catch (e) {
  console.error('Error during copy-dist:', e);
  process.exit(1);
}

