const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/app/routes/routes.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace renderManageShell
content = content.replace(
  /render:\s*\(\)\s*=>\s*renderManageShell\(([\w\(\)]+)\)/g,
  'layout: "manage",\n      render: () => $1'
);

// Replace renderMemberShell
content = content.replace(
  /render:\s*\(\)\s*=>\s*renderMemberShell\(([\w\(\)]+)\)/g,
  'layout: "member",\n      render: () => $1'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done refactoring routes.js');
