const fs = require('fs');
const path = require('path');

const dirs = [
    'ClientOnboarding', 'Onboarding', 'Home', 'Login', 
    'OTP', 'Register', 'ForgotPassword', 'AuthConsent'
];

dirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) return;
    
    fs.readdirSync(dirPath).forEach(file => {
        if (!file.endsWith('.jsx')) return;
        const filePath = path.join(dirPath, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Update relative paths that used to be ../.. (source root)
        content = content.replace(/from\s+['"]\.\.\/\.\.\//g, match => match.replace('../..', '../../..'));
        content = content.replace(/import\s+['"]\.\.\/\.\.\//g, match => match.replace('../..', '../../..'));
        
        fs.writeFileSync(filePath, content);
    });
});
console.log('Update finished');
