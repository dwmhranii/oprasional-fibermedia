#!/usr/bin/env node

/**
 * scripts/lint-copy.cjs
 * Guardrail script: scans code for forbidden terminology and hardcoded colors.
 * Fails with non-zero exit code if violations are found.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCAN_DIR = path.join(ROOT_DIR, 'resources', 'js');
const IS_VERBOSE = process.argv.includes('--verbose');

// Forbidden copy rules: regex pattern -> message & allowed files
const FORBIDDEN_PATTERNS = [
  {
    regex: /\b(Fase\s*[12])\b/gi,
    reason: 'Gunakan "Tahap 1: Pengerjaan" dan "Tahap 2: Absensi di Lokasi". Kata "Fase" dilarang di UI tiket.',
    allowedFiles: ['id.ts', 'glossary.md', 'ui-audit.md', 'lint-copy.cjs'],
  },
  {
    regex: /\b(SPK)\b/g,
    reason: 'Gunakan istilah baku "Work Order" tanpa "SPK".',
    allowedFiles: ['id.ts', 'glossary.md', 'ui-audit.md', 'lint-copy.cjs'],
  },
  {
    regex: /\b(Export\s+Excel)\b/gi,
    reason: 'Gunakan istilah baku "Ekspor Excel" (Bahasa Indonesia).',
    allowedFiles: ['id.ts', 'glossary.md', 'ui-audit.md', 'lint-copy.cjs'],
  },
  {
    regex: /\b(Import\s+Excel)\b/gi,
    reason: 'Gunakan istilah baku "Impor Excel" (Bahasa Indonesia).',
    allowedFiles: ['id.ts', 'glossary.md', 'ui-audit.md', 'lint-copy.cjs'],
  },
  {
    regex: />\s*(Presensi|Rekap\s+Presensi)\s*</gi,
    reason: 'Gunakan istilah baku "Absensi", "Absen Masuk", "Absen Pulang", "Rekap Absensi".',
    allowedFiles: ['id.ts', 'glossary.md', 'ui-audit.md', 'lint-copy.cjs'],
  },
  {
    regex: />\s*(Ketua\s+Tim|Team\s+Lead|Leader)\s*</gi,
    reason: 'Gunakan "Tim dan Anggota" (tidak ada Ketua/Lead/Leader).',
    allowedFiles: ['id.ts', 'glossary.md', 'ui-audit.md', 'lint-copy.cjs'],
  },
  {
    regex: />\s*(Suspended|Terminated)\s*</gi,
    reason: 'Gunakan status baku Bahasa Indonesia: "Terisolir" (bukan Suspended) dan "Berhenti" (bukan Terminated).',
    allowedFiles: ['id.ts', 'glossary.md', 'ui-audit.md', 'lint-copy.cjs'],
  },
];

// Hex color check in JSX/TSX outside of design tokens
const HEX_COLOR_IN_JSX = /(?:className="[^"]*|style=\{\{[^}]*|fill="|stroke=")(#[0-9a-fA-F]{3,8})/g;

let totalErrors = 0;
let totalColorWarnings = 0;
let scannedFiles = 0;

function isAllowed(filePath, allowedFiles) {
  const base = path.basename(filePath);
  return allowedFiles.some((allowed) => base === allowed || filePath.includes(allowed));
}

function scanFile(filePath) {
  const ext = path.extname(filePath);
  if (!['.tsx', '.ts', '.jsx', '.js'].includes(ext)) return;
  if (filePath.includes('api.generated.ts')) return; // ignore swagger/openAPI generator
  if (filePath.includes('vendor') || filePath.includes('node_modules')) return;

  scannedFiles++;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // 1. Check Copy
  for (const rule of FORBIDDEN_PATTERNS) {
    if (isAllowed(filePath, rule.allowedFiles)) continue;

    lines.forEach((line, index) => {
      // Skip commented lines
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

      let match;
      rule.regex.lastIndex = 0;
      while ((match = rule.regex.exec(line)) !== null) {
        console.error(
          `\x1b[31m[LINT:COPY ERROR]\x1b[0m ${path.relative(ROOT_DIR, filePath)}:${index + 1}`
        );
        console.error(`  Ditemukan istilah terlarang: "${match[0]}"`);
        console.error(`  Panduan: ${rule.reason}`);
        console.error(`  Baris: ${trimmed}\n`);
        totalErrors++;
      }
    });
  }

  // 2. Check Raw Hex Colors in JSX (allowed in tokens directory and mock data)
  const isTokenFile =
    filePath.includes('tokens') ||
    filePath.includes('tailwind') ||
    filePath.includes('leaflet') ||
    filePath.includes('vite.config') ||
    isAllowed(filePath, ['tokens', 'index.ts', 'formatters.ts']);

  if (!isTokenFile && ext === '.tsx') {
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

      HEX_COLOR_IN_JSX.lastIndex = 0;
      let hexMatch;
      while ((hexMatch = HEX_COLOR_IN_JSX.exec(line)) !== null) {
        totalColorWarnings++;
        if (IS_VERBOSE) {
          console.warn(
            `\x1b[33m[LINT:COLOR WARNING]\x1b[0m ${path.relative(ROOT_DIR, filePath)}:${index + 1}`
          );
          console.warn(`  Ditemukan warna hex langsung di komponen: "${hexMatch[1]}"\n`);
        }
      }
    });
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        walkDir(fullPath);
      }
    } else {
      scanFile(fullPath);
    }
  }
}

console.log('🔍 Memulai pemindaian lint:copy pada resources/js...');
walkDir(SCAN_DIR);
console.log(`✓ Selesai memindai ${scannedFiles} berkas.`);
if (totalColorWarnings > 0) {
  console.log(`ℹ Total warna hex ad hoc: ${totalColorWarnings} (jalankan dengan --verbose untuk melihat detail).`);
}

if (totalErrors > 0) {
  console.error(`\x1b[31m✖ GAGAL: Ditemukan ${totalErrors} pelanggaran istilah/copy.\x1b[0m`);
  process.exit(1);
} else {
  console.log('\x1b[32m✔ SUKSES: Semua istilah mematuhi Kamus Istilah Baku!\x1b[0m');
  process.exit(0);
}
