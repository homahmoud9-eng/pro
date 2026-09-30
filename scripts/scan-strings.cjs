const fs = require('fs');

const targetFiles = process.argv.slice(2).length > 0 ? process.argv.slice(2) : [
  'src/app/(dashboard)/dashboard/page.tsx',
  'src/app/(dashboard)/business/page.tsx',
  'src/app/(dashboard)/employees/page.tsx',
  'src/app/(dashboard)/documents/page.tsx',
  'src/app/(dashboard)/procedures/page.tsx',
  'src/app/(dashboard)/finance/page.tsx',
  'src/app/(dashboard)/operations/page.tsx',
  'src/app/(dashboard)/compliance/page.tsx',
  'src/app/(dashboard)/reports/page.tsx',
  'src/app/(dashboard)/notifications/page.tsx',
  'src/app/(dashboard)/audit/page.tsx',
  'src/app/(dashboard)/settings/page.tsx',
  'src/app/(auth)/login/page.tsx',
  'src/components/layout/header.tsx',
  'src/components/layout/sidebar.tsx',
  'src/components/pdf/pdf-viewer-modal.tsx',
  'src/components/security/authorization-password-dialog.tsx'
];

for (const file of targetFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  console.log(`\n=== ${file} ===`);
  let inTag = false;
  let currentTagText = '';
  
  // Also scan line by line for raw string literals and JSX text
  for (let idx = 0; idx < lines.length; idx++) {
    const l = lines[idx];
    const trimmed = l.trim();
    
    // Check attributes like placeholder, title, alt, aria-label
    const attrMatches = l.matchAll(/(placeholder|title|alt|aria-label)=["']([^"']+)["']/g);
    for (const m of attrMatches) {
      if (/[A-Za-z]/.test(m[2]) && !m[2].startsWith('http') && !m[2].startsWith('data:')) {
        console.log(`  [L${idx + 1} ${m[1]}]: "${m[2]}"`);
      }
    }

    // Single line >Text<
    const matches = l.matchAll(/>([^<>{}$`]+)</g);
    for (const match of matches) {
      const text = match[1].trim();
      if (text.length > 1 && /[A-Za-z]/.test(text) && !text.startsWith('//') && !text.startsWith('http') && !text.startsWith('AED') && !text.startsWith('&') && !text.startsWith('Promise')) {
        console.log(`  [L${idx + 1}]: "${text}"`);
      }
    }

    // Text on its own line between tags (e.g. line starts with text and doesn't have < or >)
    if (!trimmed.startsWith('<') && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*') && !trimmed.startsWith('{') && !trimmed.startsWith('}') && !trimmed.includes('=>') && !trimmed.includes('const ') && !trimmed.includes('let ') && !trimmed.includes('import ') && !trimmed.includes('export ') && !trimmed.includes('return') && !trimmed.includes('className=') && !trimmed.includes(';') && !trimmed.includes('`') && /[A-Za-z]/.test(trimmed) && trimmed.length > 2) {
      // Check if previous non-empty line ended with > or {
      let prevIdx = idx - 1;
      while (prevIdx >= 0 && lines[prevIdx].trim() === '') prevIdx--;
      if (prevIdx >= 0) {
        const prev = lines[prevIdx].trim();
        if (prev.endsWith('>') || prev.endsWith('{')) {
          console.log(`  [L${idx + 1} multiline]: "${trimmed}"`);
        }
      }
    }
  }
}
