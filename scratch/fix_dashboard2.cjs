import fs from 'fs';
let content = fs.readFileSync('c:/Projetos/termocontrol-hmi_scada/pages/Dashboard.tsx', 'utf8');

// Fix elements with more attributes after the extra classes string
// Basically match: className="absolute" style={{...}} extraClasses"
content = content.replace(/className=\"([^\"]+)\" (style=\{\{[^\}]+\}\}) ([^\">]+)\"/g, 'className=\"$1 $3\" $2');

fs.writeFileSync('c:/Projetos/termocontrol-hmi_scada/pages/Dashboard.tsx', content);
