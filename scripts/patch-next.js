const fs = require('fs');
const path = require('path');

const filesToPatch = [
  path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'server', 'app-render', 'entry-base.js'),
  path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'esm', 'server', 'app-render', 'entry-base.js')
];

for (const file of filesToPatch) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Replace the development SegmentViewNode require that causes missing client manifest errors
    const target = /if\s*\(\s*process\.env\.NODE_ENV\s*===\s*['"]development['"]\s*\)\s*\{\s*const mod\s*=\s*require\([^)]+\);\s*SegmentViewNode\s*=\s*mod\.SegmentViewNode;\s*SegmentViewStateNode\s*=\s*mod\.SegmentViewStateNode;\s*\}/g;
    if (target.test(content)) {
      content = content.replace(target, `// disabled SegmentViewNode devtools to prevent missing client manifest error`);
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Successfully patched ${file}`);
    } else {
      console.log(`Target pattern not found or already patched in ${file}`);
    }
  }
}
