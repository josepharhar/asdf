const fs = require('fs');

// Read all files in current directory
const files = fs.readdirSync('./')
  .filter(file => file.endsWith('.html') && file !== 'index.html');

// Generate list items
const listItems = files.map(file => `<li><a href="${file}">${file}</a></li>`).join('\n');

// Wrap in full HTML template
const htmlContent = `<!DOCTYPE html>
<!-- this file is generated -->
<title>asdf</title>
<h1>All Pages</h1>
<ul>
${listItems}
</ul>
`;

fs.writeFileSync('index.html', htmlContent);
console.log(`Updated index.html with ${files.length} pages!`);
