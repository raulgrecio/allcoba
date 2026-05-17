import fs from 'node:fs';

const html = fs.readFileSync(
  '__tests__/fixtures/infrastructure/adapters/sources/dating/topescortbabes_lera.html',
  'utf-8',
);
const match = html.match(
  /window\.profileData\s*=\s*(\{.*?\});\s*(?:window|console|var|let|const|function|\n\s*var)/s,
);

if (match && match[1]) {
  try {
    const data = match[1];
    fs.writeFileSync('scratch/topescortbabes_lera.json', data);
    console.log('Saved to scratch/topescortbabes_lera.json');
  } catch (e) {
    console.error('Failed to parse:', e);
  }
} else {
  // Let's try another approach if the regex fails
  const scriptMatch = html.match(
    /window\.profileData\s*=\s*(\{[\s\S]*?\}|\[[\s\S]*?\]);\s*var _req/,
  );
  if (scriptMatch) {
    fs.writeFileSync('scratch/topescortbabes_lera.json', scriptMatch[1]);
    console.log('Saved to scratch/topescortbabes_lera.json (2nd method)');
  } else {
    console.log('No window.profileData found');
  }
}
