const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

/**
 * Updates Card components props in React files to use 'variant' instead of 'bordered'
 */
async function updateCardProps(directoryPath) {
  try {
    const files = await readDirectory(directoryPath);
    
    for (const file of files) {
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        const filePath = path.join(directoryPath, file);
        let content = await readFileAsync(filePath, 'utf8');
        
        // Replace bordered={false} with variant="borderless"
        content = content.replace(/bordered={false}/g, 'variant="borderless"');
        
        // Replace bordered={true} with variant="bordered"
        content = content.replace(/bordered={true}/g, 'variant="bordered"');
        
        // Replace bordered with variant="bordered"
        content = content.replace(/bordered(?!\s*=)/g, 'variant="bordered"');
        
        await writeFileAsync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
      }
    }
    
    console.log('Card props updated successfully!');
  } catch (error) {
    console.error('Error updating Card props:', error);
  }
}

/**
 * Recursively reads directory to get all files
 */
async function readDirectory(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  
  const files = entries
    .filter(entry => !entry.isDirectory())
    .map(entry => entry.name);
    
  const directories = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
    
  for (const dir of directories) {
    const subFiles = await readDirectory(path.join(directory, dir));
    files.push(...subFiles.map(file => path.join(dir, file)));
  }
  
  return files;
}

// Usage
// updateCardProps('./src');

module.exports = { updateCardProps };
