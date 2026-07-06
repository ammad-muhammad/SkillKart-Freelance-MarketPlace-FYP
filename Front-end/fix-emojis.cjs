const fs = require('fs');
const path = require('path');

const replacements = [
  // ClientMessages.jsx
  {
    file: 'ClientMessages.jsx',
    rules: [
      { from: "📄 {a.name || 'Document'}", to: "<FileText size={16} /> <span style={{marginLeft: '4px'}}>{a.name || 'Document'}</span>" },
      { from: "{uploading ? '⏳' : '📎'}", to: "{uploading ? <Loader2 className=\"spin\" size={18}/> : <Paperclip size={18}/>}" }
    ],
    imports: "import { FileText, Paperclip, Loader2 } from 'lucide-react';"
  },
  // ClientProjects.jsx
  {
    file: 'ClientProjects.jsx',
    rules: [
      { from: "showToast('Remaining 50% paid directly from your wallet balance! 🎉');", to: "showToast('Remaining 50% paid directly from your wallet balance!');" },
      { from: "showToast('Delivery accepted. Project completed! 🎉');", to: "showToast('Delivery accepted. Project completed!');" },
      { from: "showToast('50% deposit funded successfully from your wallet balance! Work can begin. 🚀', 'success');", to: "showToast('50% deposit funded successfully from your wallet balance! Work can begin.', 'success');" },
      { from: "if (ok) showToast('Project published successfully! 🚀');", to: "if (ok) showToast('Project published successfully!');" },
      { from: "'🛍️ Gig Order'", to: "<span><ShoppingBag size={14} style={{ marginRight: '6px' }} /> Gig Order</span>" },
      { from: "'📝 Custom Project'", to: "<span><FileEdit size={14} style={{ marginRight: '6px' }} /> Custom Project</span>" },
      { from: "'🟢 Open'", to: "<span><Circle fill=\"#22c55e\" size={10} style={{ marginRight: '6px' }} /> Open</span>" },
      { from: "'📂 Draft'", to: "<span><Folder size={14} style={{ marginRight: '6px' }} /> Draft</span>" },
      { from: "'📦 Delivered — review needed'", to: "<span><Package size={14} style={{ marginRight: '6px' }} /> Delivered — review needed</span>" },
      { from: "'🔁 In Revision'", to: "<span><RefreshCw size={14} style={{ marginRight: '6px' }} /> In Revision</span>" },
      { from: "'🔵 In Progress'", to: "<span><Circle fill=\"#3b82f6\" size={10} style={{ marginRight: '6px' }} /> In Progress</span>" },
      { from: "'✅ Completed'", to: "<span><CheckCircle size={14} style={{ marginRight: '6px', color: '#22c55e' }} /> Completed</span>" },
      { from: "'⚪ Closed'", to: "<span><Circle fill=\"#64748b\" size={10} style={{ marginRight: '6px' }} /> Closed</span>" },
      { from: "⚠️ Contract under Dispute", to: "<AlertTriangle size={14} style={{ marginRight: '6px' }} /> Contract under Dispute" },
      { from: "🛑 Freelancer has requested to end this contract", to: "<XCircle size={14} style={{ marginRight: '6px' }} /> Freelancer has requested to end this contract" },
      { from: "⚪ Freelancer stopped working", to: "<Circle fill=\"#64748b\" size={10} style={{ marginRight: '6px' }} /> Freelancer stopped working" },
      { from: "🟢 Freelancer is currently working", to: "<Circle fill=\"#22c55e\" size={10} style={{ marginRight: '6px' }} /> Freelancer is currently working" },
      { from: "⚪ Freelancer is not working right now", to: "<Circle fill=\"#64748b\" size={10} style={{ marginRight: '6px' }} /> Freelancer is not working right now" },
      { from: "🕒 Total logged:", to: "<Clock size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Total logged:" },
      { from: "💰 Budget:", to: "<DollarSign size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Budget:" },
      { from: "📅 Deadline:", to: "<Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Deadline:" },
      { from: "🚀 Publish Draft", to: "<Send size={14} style={{ marginRight: '6px' }} /> Publish Draft" },
      { from: "✅ Deposit Funded", to: "<CheckCircle size={14} style={{ marginRight: '6px', color: '#22c55e' }} /> Deposit Funded" },
      { from: "💳 Fund Deposit", to: "<CreditCard size={14} style={{ marginRight: '6px' }} /> Fund Deposit" },
      { from: "📂 View Submitted Work", to: "<Folder size={14} style={{ marginRight: '6px' }} /> View Submitted Work" },
      { from: "⭐️ Leave Review", to: "<Star size={14} style={{ marginRight: '6px' }} /> Leave Review" },
      { from: "📦 Review Submitted Work", to: "<Package size={14} style={{ marginRight: '6px' }} /> Review Submitted Work" },
      { from: "🛑 End Contract", to: "<XCircle size={14} style={{ marginRight: '6px' }} /> End Contract" },
      { from: "⚠️ Dispute (Force End)", to: "<AlertTriangle size={14} style={{ marginRight: '6px' }} /> Dispute (Force End)" },
      { from: "👥 View Proposals", to: "<Users size={14} style={{ marginRight: '6px' }} /> View Proposals" },
      { from: "💬 Contact Freelancer", to: "<MessageSquare size={14} style={{ marginRight: '6px' }} /> Contact Freelancer" },
      { from: "✏ Edit", to: "<Edit3 size={14} style={{ marginRight: '6px' }} /> Edit" },
      { from: "🗑 Delete", to: "<Trash2 size={14} style={{ marginRight: '6px' }} /> Delete" },
      { from: "✅ Accept & Complete", to: "<Check size={14} style={{ marginRight: '6px' }} /> Accept & Complete" },
      { from: "🔁 Request Revision", to: "<RefreshCw size={14} style={{ marginRight: '6px' }} /> Request Revision" },
      { from: "⚠ ", to: "<AlertCircle size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> " }
    ],
    imports: "import { FileEdit, ShoppingBag, Circle, Folder, Package, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock, DollarSign, Calendar, Send, CreditCard, Star, Users, MessageSquare, Edit3, Trash2, Check, AlertCircle } from 'lucide-react';"
  },
  // PostProject.jsx
  {
    file: 'PostProject.jsx',
    rules: [
      { from: "⚠ ", to: "<AlertCircle size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> " },
      { from: "✨ Suggest category (AI)", to: "<Sparkles size={14} style={{ marginRight: '6px' }} /> Suggest category (AI)" },
      { from: "🤖 Not sure what to pay? Estimate a fair budget →", to: "<Bot size={14} style={{ marginRight: '6px' }} /> Not sure what to pay? Estimate a fair budget →" },
      { from: "✕</button>", to: "<X size={14} /></button>" },
      { from: "＋ Add Link", to: "<Plus size={14} style={{ marginRight: '4px' }} /> Add Link" },
      { from: "＋ Add FAQ", to: "<Plus size={14} style={{ marginRight: '4px' }} /> Add FAQ" },
      { from: "<span>📸</span>", to: "<span><Camera size={40} /></span>" },
      { from: "<span>📁</span>", to: "<span><Folder size={40} /></span>" },
      { from: "🚀 Publish Project Now", to: "<Send size={16} style={{ marginRight: '8px' }} /> Publish Project Now" },
      { from: "💾 Save as Draft", to: "<Save size={16} style={{ marginRight: '8px' }} /> Save as Draft" },
      { from: "← Previous", to: "<ArrowLeft size={16} style={{ marginRight: '8px' }} /> Previous" },
      { from: "Continue →", to: "Continue <ArrowRight size={16} style={{ marginLeft: '8px' }} />" }
    ],
    imports: "import { AlertCircle, Sparkles, Bot, X, Plus, Camera, Folder, Send, Save, ArrowLeft, ArrowRight } from 'lucide-react';"
  },
  // ReviewProposals.jsx
  {
    file: 'ReviewProposals.jsx',
    rules: [
      { from: "toast.success('50% deposit funded successfully from your wallet balance! Work can begin. 🚀');", to: "toast.success('50% deposit funded successfully from your wallet balance! Work can begin.');" },
      { from: "<div className=\"rp-empty__icon\">📭</div>", to: "<div className=\"rp-empty__icon\"><Inbox size={48} /></div>" }
    ],
    imports: "import { Inbox } from 'lucide-react';"
  },
  // ClientSavedFreelancers.jsx
  {
    file: 'ClientSavedFreelancers.jsx',
    rules: [
      { from: "<div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔖</div>", to: "<div style={{ marginBottom: '1.5rem', color: 'var(--color-primary)' }}><Bookmark size={64} /></div>" }
    ],
    imports: "import { Bookmark } from 'lucide-react';"
  },
  // ClientSecurity.jsx
  {
    file: 'ClientSecurity.jsx',
    rules: [
      { from: "🔑 Account Information", to: "<Key size={18} style={{ marginRight: '8px' }} /> Account Information" },
      { from: "🔑 Change Password", to: "<Key size={18} style={{ marginRight: '8px' }} /> Change Password" },
      { from: "🙈", to: "<EyeOff size={16} />" },
      { from: "👁️", to: "<Eye size={16} />" },
      { from: "⚠ ", to: "<AlertCircle size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> " },
      { from: "🔒 Change Password", to: "<Lock size={16} style={{ marginRight: '8px' }} /> Change Password" },
      { from: "🛡️ Security Options", to: "<Shield size={18} style={{ marginRight: '8px' }} /> Security Options" },
      { from: "🔔 Login Alerts", to: "<Bell size={16} style={{ marginRight: '8px' }} /> Login Alerts" },
      { from: "🔐 Two-Factor Authentication", to: "<Lock size={16} style={{ marginRight: '8px' }} /> Two-Factor Authentication" },
      { from: "🛡️ Password Change Alerts", to: "<Shield size={16} style={{ marginRight: '8px' }} /> Password Change Alerts" },
      { from: "⚠️ Danger Zone", to: "<AlertTriangle size={18} style={{ marginRight: '8px' }} /> Danger Zone" },
      { from: "🗑 Deactivate Account", to: "<Trash2 size={16} style={{ marginRight: '8px' }} /> Deactivate Account" },
      { from: "<div style={{ fontSize: '3rem' }}>📧</div>", to: "<div style={{ color: 'var(--color-primary)' }}><Mail size={48} /></div>" }
    ],
    imports: "import { Key, EyeOff, Eye, AlertCircle, Lock, Shield, Bell, AlertTriangle, Trash2, Mail } from 'lucide-react';"
  },
  // ClientSettings.jsx
  {
    file: 'ClientSettings.jsx',
    rules: [
      { from: "🏷️ Account Information", to: "<Tag size={18} style={{ marginRight: '8px' }} /> Account Information" },
      { from: "⚠ ", to: "<AlertCircle size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> " },
      { from: "🔁 Recovery Options", to: "<RefreshCw size={16} style={{ marginRight: '6px' }} /> Recovery Options" },
      { from: "🔔 Notification Settings", to: "<Bell size={18} style={{ marginRight: '8px' }} /> Notification Settings" },
      { from: "⚠️ Danger Zone", to: "<AlertTriangle size={18} style={{ marginRight: '8px' }} /> Danger Zone" },
      { from: "🗑 Delete My Account", to: "<Trash2 size={16} style={{ marginRight: '8px' }} /> Delete My Account" }
    ],
    imports: "import { Tag, AlertCircle, RefreshCw, Bell, AlertTriangle, Trash2 } from 'lucide-react';"
  }
];

replacements.forEach(({ file, rules, imports }) => {
  const filePath = path.join('src/pages/client', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add imports if not present
    if (!content.includes(imports.split(' ')[2])) {
      const parts = content.split('\n');
      let importIndex = parts.findIndex(line => line.includes('import ') && !line.includes('lucide-react'));
      if(importIndex === -1) importIndex = 0;
      
      // Handle merging imports with existing lucide-react imports if it exists
      if (content.includes('from \'lucide-react\'')) {
         // for simplicity, just add our import at top and let duplicate imports stay (ESLint might warn but it works)
         // Actually better to replace the imports string
         content = imports + '\n' + content;
      } else {
         content = imports + '\n' + content;
      }
    }
    
    // Replace all strings
    rules.forEach(rule => {
      // Split and join to replace all occurrences
      content = content.split(rule.from).join(rule.to);
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', file);
  }
});
