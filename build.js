#!/usr/bin/env node

const fs = require('fs');

// Read all files in current directory
const files = fs.readdirSync('./')
  .filter(file => file.endsWith('.html') && file !== 'index.html');

// Generate list items
const listItems = files.map(file => `<li><a href="${file}">${file}</a></li>`).join('\n');

// Wrap in full HTML template
const htmlContent = `<!DOCTYPE html>
<!-- this file is generated -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>asdf</title>
<style>
li {
  min-block-size: 24px;
}
</style>
<h1>Testing pages</h1>
<nav>
  <ul>
    ${listItems}
  </ul>
</nav>
`;

fs.writeFileSync('index.html', htmlContent);
console.log(`Updated index.html with ${files.length} pages!`);
