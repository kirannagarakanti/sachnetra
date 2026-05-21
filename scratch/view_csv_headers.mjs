import * as fs from 'node:fs';
import * as path from 'node:path';

const files = fs.readdirSync('scratch').filter(f => f.startsWith('bis_') && f.endsWith('.csv'));
for (const file of files) {
  const p = path.join('scratch', file);
  const content = fs.readFileSync(p, 'utf8');
  const lines = content.split('\n').filter(Boolean);
  console.log(`\nFile: ${file} (lines: ${lines.length})`);
  console.log('Headers:', lines[0]);
  for (let i = 1; i < Math.min(5, lines.length); i++) {
    console.log(`Line ${i}:`, lines[i]);
  }
}
