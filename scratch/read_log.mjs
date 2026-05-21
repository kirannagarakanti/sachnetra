import fs from 'node:fs';

try {
  const content = fs.readFileSync('scratch/probe_output.log', 'utf16le');
  fs.writeFileSync('scratch/probe_output_utf8.log', content, 'utf8');
  console.log('Successfully converted log to UTF-8.');
} catch (err) {
  console.error(err);
}
