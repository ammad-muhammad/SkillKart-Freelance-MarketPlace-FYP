const fs = require('fs');

const replaceInFile = (path, searchStr, replaceStr, importStr) => {
  let content = fs.readFileSync(path, 'utf8');
  if (importStr && !content.includes('LogOut')) {
    content = content.replace("} from 'lucide-react';", "  LogOut\n} from 'lucide-react';");
  }
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(path, content);
};

// ClientSidebar
replaceInFile(
  'Front-end/src/pages/client/components/ClientSidebar.jsx', 
  '<span>🚪</span>', 
  '<span className="cl-sidebar__icon"><LogOut size={20} /></span>',
  true
);

// FreelancerSidebar
replaceInFile(
  'Front-end/src/pages/freelancer/components/FreelancerSidebar.jsx', 
  '<span>🚪</span>', 
  '<span className="fl-sidebar__icon"><LogOut size={20} /></span>',
  true
);

// ClientSecurity
replaceInFile(
  'Front-end/src/pages/client/ClientSecurity.jsx', 
  '🚪 {loggingOutAll', 
  '<LogOut size={16} /> {loggingOutAll',
  false
);

// Add LogOut to ClientSecurity if missing
let secContent = fs.readFileSync('Front-end/src/pages/client/ClientSecurity.jsx', 'utf8');
if (!secContent.includes('import { LogOut } from')) {
  secContent = secContent.replace('import { AuthContext }', "import { LogOut } from 'lucide-react';\nimport { AuthContext }");
  fs.writeFileSync('Front-end/src/pages/client/ClientSecurity.jsx', secContent);
}
console.log('Replaced successfully');
