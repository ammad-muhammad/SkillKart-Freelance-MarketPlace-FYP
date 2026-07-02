const fs = require('fs');

const fixSidebar = (path, iconClass) => {
  let content = fs.readFileSync(path, 'utf8');
  
  // Replace the import
  content = content.replace(
    /  Lock\r?\n\} from 'lucide-react';/,
    "  Lock,\n  LogOut\n} from 'lucide-react';"
  );
  
  // If Lock isn't the last one (like in FreelancerSidebar)
  content = content.replace(
    /  CheckCircle2\r?\n\} from 'lucide-react';/,
    "  CheckCircle2,\n  LogOut\n} from 'lucide-react';"
  );

  // Replace the emoji
  content = content.replace(
    /<span>🚪<\/span>/,
    `<span className="${iconClass}"><LogOut size={20} /></span>`
  );
  
  fs.writeFileSync(path, content);
};

fixSidebar('Front-end/src/pages/client/components/ClientSidebar.jsx', 'cl-sidebar__icon');
fixSidebar('Front-end/src/pages/freelancer/components/FreelancerSidebar.jsx', 'fl-sidebar__icon');
