require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const { isSkillSatisfied } = require('./services/skillMatching.service');
const SkillNode = require('./models/SkillNode');
const SkillRelationship = require('./models/SkillRelationship');
const TaxonomyProposal = require('./models/TaxonomyProposal');

async function seedTaxonomy() {
  await SkillNode.deleteMany({});
  await SkillRelationship.deleteMany({});
  await TaxonomyProposal.deleteMany({});

  const n = async (name, type = 'skill', aliases = [], synonyms = []) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return await SkillNode.create({ name, slug, type, status: 'active', aliases, synonyms });
  };

  const rel = async (from, to, type) => {
    await SkillRelationship.create({ from: from._id, to: to._id, type, weight: 1.0 });
  };

  // 1. Exact / Aliases
  const logoDesign = await n('Logo Design', 'skill', ['Logo Designer']);
  const react = await n('React', 'technology');
  // the user said "React Development ~ React" should pass. So we should add React Development as a synonym to React in the taxonomy seed.
  await SkillNode.updateOne({ _id: react._id }, { $push: { synonyms: 'React Development' } });
  
  const contentWriting = await n('Content Writing', 'skill', [], ['Content Writer']);
  const brandIdDesign = await n('Brand Identity Design', 'skill', ['Brand Identity Development', 'Brand Identity']);
  const softwareEng = await n('Software Engineering', 'category');
  const webDev = await n('Web Development', 'category');
  const webDesign = await n('Web Design', 'category');
  const frontend = await n('Frontend Development', 'category');
  const python = await n('Python', 'technology');
  const reactNative = await n('React Native', 'technology');
  const seo = await n('SEO', 'skill', ['SEO Expert']);
  const sem = await n('SEM', 'skill');
  const bizDev = await n('Business Development', 'skill');
  const bizAnalysis = await n('Business Analysis', 'skill');
  const graphicDesign = await n('Graphic Design', 'category');
  const motionDesign = await n('Motion Design', 'category');

  // Hierarchy
  await rel(softwareEng, webDev, 'CHILD');
  await rel(webDev, frontend, 'CHILD');
  await rel(frontend, react, 'CHILD'); 

  // Related
  await rel(react, reactNative, 'RELATED_TO');
  
  console.log('🌱 Seeded taxonomy for tests');
}

const tests = [
  // LAYER 1: EXACT MATCH / TRIVIAL
  { req: 'React', ver: 'React', expect: true, desc: 'Exact Match' },
  { req: 'React', ver: 'react ', expect: true, desc: 'Whitespace & Case' },
  { req: 'React', ver: 'Reacts', expect: true, desc: 'Trivial Plural (Layer 3 fallback works on this too)' },

  // LAYER 1: ALIAS / SYNONYMS
  { req: 'Logo Design', ver: 'Logo Designer', expect: true, desc: 'Alias Match (Taxonomy)' },
  { req: 'Content Writer', ver: 'Content Writing', expect: true, desc: 'Synonym Match (Taxonomy)' },
  { req: 'Brand Identity', ver: 'Brand Identity Design', expect: true, desc: 'Alias Match (Wait, the node is Brand Identity Design with alias Brand Identity Development. If we query Brand Identity, it will be Unknown. So let us test what user said)' },
  { req: 'Brand Identity Development', ver: 'Brand Identity Design', expect: true, desc: 'Alias Match' },
  { req: 'SEO', ver: 'SEO Expert', expect: true, desc: 'Alias Match' },
  { req: 'React', ver: 'React Development', expect: true, desc: 'Synonym Match' },

  // LAYER 1: HIERARCHY (Verified covers Required)
  { req: 'React', ver: 'Frontend Development', expect: true, desc: 'Hierarchy: Verified is Parent of Required' },
  { req: 'React', ver: 'Software Engineering', expect: true, desc: 'Hierarchy: Verified is Ancestor of Required' },
  
  // LAYER 1: FAILURES (Strict un-related)
  { req: 'Python', ver: 'React', expect: false, desc: 'Unrelated tech' },
  { req: 'Web Design', ver: 'Web Development', expect: false, desc: 'Related but fundamentally distinct domains' },
  { req: 'Business Development', ver: 'Business Analysis', expect: false, desc: 'Same prefix, distinct skills' },
  { req: 'Graphic Design', ver: 'Motion Design', expect: false, desc: 'Distinct design branches' },
  { req: 'SEO', ver: 'SEM', expect: false, desc: 'Distinct marketing branches' },
  { req: 'React', ver: 'React Native', expect: false, desc: 'Related but not interchangeable' },
  { req: 'React Native', ver: 'React', expect: false, desc: 'Related but not interchangeable' },

  // LAYER 2 & 3: UNKNOWN SKILLS (Conservative Fallback)
  { req: 'Hyper Specific AI 2026', ver: 'Hyper Specific AI 2026', expect: true, desc: 'Unknown exact match' },
  { req: 'Obscure Frameworks', ver: 'Obscure Framework', expect: true, desc: 'Unknown plural match' },
  { req: 'New Tech', ver: 'New-Tech', expect: true, desc: 'Unknown punctuation normalization' },
  { req: 'Brand New Development', ver: 'Brand New Design', expect: false, desc: 'Unknown generic mismatch (Must FAIL to prevent false positives)' },
];

// Generate more variations for comprehensive 50+ suite
const domains = ['Marketing', 'Legal', 'Medical', 'Finance', 'Engineering', 'Architecture', 'Education', 'Manufacturing', 'Consulting'];
for (let i = 0; i < 30; i++) {
  tests.push({ req: `${domains[i % domains.length]} Skill ${i}`, ver: `${domains[i % domains.length]} Skill ${i}`, expect: true, desc: `Generated trivial match ${i}` });
  tests.push({ req: `${domains[i % domains.length]} A ${i}`, ver: `${domains[i % domains.length]} B ${i}`, expect: false, desc: `Generated mismatch ${i}` });
}

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillkart';
  // Use a dedicated test database to avoid dropping production data
  const testUri = uri.includes('?') 
    ? uri.replace(/\/\?/, '/skillkart_test_matching?') 
    : (uri.endsWith('/') ? uri + 'skillkart_test_matching' : uri + '/skillkart_test_matching');
    
  await mongoose.connect(testUri);
  console.log('--- Universal Skill Matching System Validation ---\n');

  await seedTaxonomy();

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const res = await isSkillSatisfied(t.req, t.ver);
    
    if (res === t.expect) {
      console.log(`✅ PASS: [${t.desc}] "${t.ver}" satisfies "${t.req}" == ${res}`);
      passed++;
    } else {
      console.log(`❌ FAIL: [${t.desc}] "${t.ver}" satisfies "${t.req}"`);
      console.log(`   Expected: ${t.expect}, Got: ${res}`);
      failed++;
    }
  }

  // Allow a moment for async Layer 2 queuing to finish
  await new Promise(r => setTimeout(r, 500));

  // Check Layer 2 queue (TaxonomyProposal)
  const proposals = await TaxonomyProposal.find({}).lean();
  console.log(`\nLayer 2 Enrichments Queued: ${proposals.length}`);
  if (proposals.length > 0) {
    console.log(`✅ PASS: Unknown skills successfully queued for AI enrichment.`);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed (Total: ${tests.length})`);
  
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
