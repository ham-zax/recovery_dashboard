import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string, fileCallback: (filePath: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, fileCallback);
    } else {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        fileCallback(filePath);
      }
    }
  }
}

walk(path.join(process.cwd(), 'src'), (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content
    .replace(/'\/recovery\/api/g, "'/api")
    .replace(/`\/recovery\/api/g, "`/api")
    .replace(/"\/recovery\/api/g, "\"/api")
    .replace(/'\/recovery/g, "'")
    .replace(/`\/recovery/g, "`")
    .replace(/"\/recovery/g, "\"")
    .replace(/'\/'/g, "'/'") // Fix potential empty path issue if it was just '/recovery'
    .replace(/"\""/g, "\"\"")
    .replace(/item\.href !== '\/'/g, "item.href !== '/'")
    .replace(/item\.href === '\/'/g, "item.href === '/'")
    .replace(/pathname === '\/'/g, "pathname === '/'");

  // Fix exact match replacements like: href: '' -> href: '/'
  newContent = newContent.replace(/href: ''/g, "href: '/'");
  newContent = newContent.replace(/href: ""/g, "href: \"/\"");
  newContent = newContent.replace(/href=""/g, "href=\"/\"");
  newContent = newContent.replace(/href=''/g, "href='/'");

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
});
