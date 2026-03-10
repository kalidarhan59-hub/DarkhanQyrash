import fs from 'fs';

const files = [
  'src/App.tsx',
  'src/components/RankBadge.tsx',
  'src/services/gemini.ts',
  'server.ts'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\\\`/g, '`');
    content = content.replace(/\\\$/g, '$');
    fs.writeFileSync(file, content);
  }
}
