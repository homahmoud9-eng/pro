import { en } from '../src/i18n/en.ts';
import { ar } from '../src/i18n/ar.ts';

function compareKeys(enObj, arObj, prefix = '') {
  let errors = [];

  const enKeys = Object.keys(enObj);
  const arKeys = Object.keys(arObj);

  // Check for missing keys in ar
  for (const k of enKeys) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (!(k in arObj)) {
      errors.push(`Missing key in AR: ${fullKey}`);
      continue;
    }

    const enVal = enObj[k];
    const arVal = arObj[k];

    if (typeof enVal !== typeof arVal) {
      errors.push(`Type mismatch at ${fullKey}: en is ${typeof enVal}, ar is ${typeof arVal}`);
      continue;
    }

    if (typeof enVal === 'object' && enVal !== null) {
      errors = errors.concat(compareKeys(enVal, arVal, fullKey));
    } else if (typeof enVal === 'string') {
      if (!arVal || arVal.trim() === '') {
        errors.push(`Empty value in AR at ${fullKey}`);
      }
      if (!enVal || enVal.trim() === '') {
        errors.push(`Empty value in EN at ${fullKey}`);
      }
    }
  }

  // Check for extra keys in ar that are not in en
  for (const k of arKeys) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (!(k in enObj)) {
      errors.push(`Orphan key in AR (not in EN): ${fullKey}`);
    }
  }

  return errors;
}

console.log('==================================================');
console.log('🌐 VERIFYING I18N DICTIONARY KEY PARITY');
console.log('==================================================');

const diffs = compareKeys(en, ar);

if (diffs.length > 0) {
  console.error(`❌ Found ${diffs.length} translation parity issue(s):`);
  diffs.forEach(d => console.error('  - ' + d));
  process.exit(1);
} else {
  // Count total keys
  function countKeys(obj) {
    let count = 0;
    for (const k in obj) {
      if (typeof obj[k] === 'object' && obj[k] !== null) {
        count += countKeys(obj[k]);
      } else {
        count++;
      }
    }
    return count;
  }

  const totalKeys = countKeys(en);
  console.log(`✅ 100% Translation Parity Verified!`);
  console.log(`   Total synchronized keys: ${totalKeys} across EN and AR`);
  console.log('==================================================\n');
  process.exit(0);
}
