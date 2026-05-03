import fs from 'fs';

const content = fs.readFileSync('c:/Users/alfat/saas-project-manager/project-manager-frontend/src/pages/BoardPage.jsx', 'utf8');
const lines = content.split('\n');

let braceLevel = 0;
let parenLevel = 0;
let bracketLevel = 0;

console.log(`Checking balance for the whole file...`);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line) continue;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') braceLevel++;
    else if (char === '}') braceLevel--;
    else if (char === '(') parenLevel++;
    else if (char === ')') parenLevel--;
    else if (char === '[') bracketLevel++;
    else if (char === ']') bracketLevel--;
    
    if (braceLevel < 0 || parenLevel < 0 || bracketLevel < 0) {
      console.log(`Error at line ${i + 1}, column ${j + 1}: Unbalanced closing char '${char}'`);
      console.log(`Levels: {:${braceLevel}, (:${parenLevel}, [:${bracketLevel}`);
    }
  }
}

console.log(`Final levels: {:${braceLevel}, (:${parenLevel}, [:${bracketLevel}`);
if (braceLevel === 0 && parenLevel === 0 && bracketLevel === 0) {
  console.log("All clear!");
} else {
  console.log("Still unbalanced.");
}
