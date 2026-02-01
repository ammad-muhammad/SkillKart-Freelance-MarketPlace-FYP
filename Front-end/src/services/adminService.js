// =====================================================
// SKILLKART ADMIN SERVICE - Comprehensive Mock Data
// =====================================================

// --- MOCK CONSTANTS ---
const DELAY_MS = 400; // Simulated network latency
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- MOCK DATABASE ---

// ================== FREELANCERS ==================
let mockFreelancers = [
  { id: "FRL-001", name: "Ahmed Khan", email: "ahmed.khan@email.com", skill: "React Developer", verificationStatus: "Verified", skillTestStatus: "Passed", activeProjects: 3, rating: 4.8, avatar: "https://i.pravatar.cc/150?u=frl1", joined: "2024-01-15", city: "Karachi", earnings: 125000, completedProjects: 24 },
  { id: "FRL-002", name: "Fatima Ali", email: "fatima.ali@email.com", skill: "UI/UX Designer", verificationStatus: "Verified", skillTestStatus: "Passed", activeProjects: 2, rating: 4.9, avatar: "https://i.pravatar.cc/150?u=frl2", joined: "2024-01-20", city: "Lahore", earnings: 98000, completedProjects: 18 },
  { id: "FRL-003", name: "Hassan Raza", email: "hassan.raza@email.com", skill: "Node.js Developer", verificationStatus: "Pending", skillTestStatus: "Not Taken", activeProjects: 0, rating: 0, avatar: "https://i.pravatar.cc/150?u=frl3", joined: "2024-02-01", city: "Islamabad", earnings: 0, completedProjects: 0 },
  { id: "FRL-004", name: "Ayesha Malik", email: "ayesha.malik@email.com", skill: "WordPress Expert", verificationStatus: "Verified", skillTestStatus: "Passed", activeProjects: 4, rating: 4.7, avatar: "https://i.pravatar.cc/150?u=frl4", joined: "2024-01-10", city: "Faisalabad", earnings: 75000, completedProjects: 32 },
  { id: "FRL-005", name: "Usman Shah", email: "usman.shah@email.com", skill: "Python Developer", verificationStatus: "Rejected", skillTestStatus: "Failed", activeProjects: 0, rating: 3.2, avatar: "https://i.pravatar.cc/150?u=frl5", joined: "2024-02-05", city: "Rawalpindi", earnings: 15000, completedProjects: 3 },
  { id: "FRL-006", name: "Sana Ahmed", email: "sana.ahmed@email.com", skill: "Graphic Designer", verificationStatus: "Verified", skillTestStatus: "Passed", activeProjects: 1, rating: 4.6, avatar: "https://i.pravatar.cc/150?u=frl6", joined: "2024-01-25", city: "Multan", earnings: 62000, completedProjects: 15 },
  { id: "FRL-007", name: "Bilal Hussain", email: "bilal.hussain@email.com", skill: "Mobile App Developer", verificationStatus: "Verified", skillTestStatus: "Passed", activeProjects: 2, rating: 4.5, avatar: "https://i.pravatar.cc/150?u=frl7", joined: "2024-01-18", city: "Karachi", earnings: 180000, completedProjects: 12 },
  { id: "FRL-008", name: "Zara Khan", email: "zara.khan@email.com", skill: "Content Writer", verificationStatus: "Pending", skillTestStatus: "Pending", activeProjects: 0, rating: 0, avatar: "https://i.pravatar.cc/150?u=frl8", joined: "2024-02-10", city: "Lahore", earnings: 0, completedProjects: 0 },
  { id: "FRL-009", name: "Imran Qureshi", email: "imran.qureshi@email.com", skill: "SEO Specialist", verificationStatus: "Verified", skillTestStatus: "Passed", activeProjects: 5, rating: 4.4, avatar: "https://i.pravatar.cc/150?u=frl9", joined: "2024-01-05", city: "Peshawar", earnings: 88000, completedProjects: 45 },
  { id: "FRL-010", name: "Maria Farooq", email: "maria.farooq@email.com", skill: "Video Editor", verificationStatus: "Verified", skillTestStatus: "Passed", activeProjects: 3, rating: 4.7, avatar: "https://i.pravatar.cc/150?u=frl10", joined: "2024-01-12", city: "Quetta", earnings: 95000, completedProjects: 28 },
];

// ================== CLIENTS ==================
let mockClients = [
  { id: "CLT-001", name: "TechStart Solutions", email: "contact@techstart.pk", projectsPosted: 12, paymentsMade: 450000, status: "Active", avatar: "https://i.pravatar.cc/150?u=clt1", joined: "2024-01-08", city: "Karachi", type: "Business" },
  { id: "CLT-002", name: "Digital Minds Agency", email: "info@digitalminds.com", projectsPosted: 8, paymentsMade: 280000, status: "Active", avatar: "https://i.pravatar.cc/150?u=clt2", joined: "2024-01-15", city: "Lahore", type: "Agency" },
  { id: "CLT-003", name: "Ali Enterprises", email: "ali@enterprise.pk", projectsPosted: 3, paymentsMade: 75000, status: "Active", avatar: "https://i.pravatar.cc/150?u=clt3", joined: "2024-02-01", city: "Islamabad", type: "Business" },
  { id: "CLT-004", name: "Saad Malik", email: "saad.malik@gmail.com", projectsPosted: 2, paymentsMade: 25000, status: "Active", avatar: "https://i.pravatar.cc/150?u=clt4", joined: "2024-02-05", city: "Faisalabad", type: "Individual" },
  { id: "CLT-005", name: "EduTech Pakistan", email: "hello@edutech.pk", projectsPosted: 15, paymentsMade: 620000, status: "Premium", avatar: "https://i.pravatar.cc/150?u=clt5", joined: "2023-12-20", city: "Karachi", type: "Business" },
  { id: "CLT-006", name: "FoodieApp Inc", email: "dev@foodieapp.com", projectsPosted: 5, paymentsMade: 180000, status: "Active", avatar: "https://i.pravatar.cc/150?u=clt6", joined: "2024-01-22", city: "Lahore", type: "Startup" },
  { id: "CLT-007", name: "Hassan Trading Co", email: "info@hassantrading.pk", projectsPosted: 1, paymentsMade: 15000, status: "Inactive", avatar: "https://i.pravatar.cc/150?u=clt7", joined: "2024-01-30", city: "Multan", type: "Business" },
  { id: "CLT-008", name: "Creative Studios", email: "creative@studios.pk", projectsPosted: 7, paymentsMade: 195000, status: "Active", avatar: "https://i.pravatar.cc/150?u=clt8", joined: "2024-01-10", city: "Rawalpindi", type: "Agency" },
];

// ================== PROJECTS ==================
let mockProjects = [
  { id: "PRJ-001", title: "E-commerce Website Development", client: "TechStart Solutions", clientId: "CLT-001", freelancer: "Ahmed Khan", freelancerId: "FRL-001", status: "In Progress", paymentType: "30% Upfront", budget: 150000, deadline: "2024-03-15", createdAt: "2024-02-01" },
  { id: "PRJ-002", title: "Mobile App UI Design", client: "Digital Minds Agency", clientId: "CLT-002", freelancer: "Fatima Ali", freelancerId: "FRL-002", status: "In Progress", paymentType: "30% Upfront", budget: 80000, deadline: "2024-02-28", createdAt: "2024-01-25" },
  { id: "PRJ-003", title: "WordPress Blog Setup", client: "Saad Malik", clientId: "CLT-004", freelancer: "Ayesha Malik", freelancerId: "FRL-004", status: "Completed", paymentType: "100% Upfront", budget: 25000, deadline: "2024-02-10", createdAt: "2024-02-01" },
  { id: "PRJ-004", title: "SEO Optimization Package", client: "EduTech Pakistan", clientId: "CLT-005", freelancer: "Imran Qureshi", freelancerId: "FRL-009", status: "In Progress", paymentType: "30% Upfront", budget: 45000, deadline: "2024-03-01", createdAt: "2024-02-05" },
  { id: "PRJ-005", title: "Promotional Video Edit", client: "FoodieApp Inc", clientId: "CLT-006", freelancer: "Maria Farooq", freelancerId: "FRL-010", status: "Under Review", paymentType: "30% Upfront", budget: 35000, deadline: "2024-02-20", createdAt: "2024-02-08" },
  { id: "PRJ-006", title: "React Dashboard Development", client: "Creative Studios", clientId: "CLT-008", freelancer: "Ahmed Khan", freelancerId: "FRL-001", status: "In Progress", paymentType: "30% Upfront", budget: 120000, deadline: "2024-03-20", createdAt: "2024-02-10" },
  { id: "PRJ-007", title: "Logo Design Package", client: "Ali Enterprises", clientId: "CLT-003", freelancer: "Sana Ahmed", freelancerId: "FRL-006", status: "Completed", paymentType: "100% Upfront", budget: 15000, deadline: "2024-02-05", createdAt: "2024-01-28" },
  { id: "PRJ-008", title: "Flutter App Development", client: "EduTech Pakistan", clientId: "CLT-005", freelancer: "Bilal Hussain", freelancerId: "FRL-007", status: "In Progress", paymentType: "30% Upfront", budget: 200000, deadline: "2024-04-01", createdAt: "2024-02-01" },
];

// ================== GIGS ==================
let mockGigs = [
  { id: "GIG-001", title: "Professional React Development", freelancer: "Ahmed Khan", freelancerId: "FRL-001", skill: "React Developer", price: 5000, priceUnit: "per hour", status: "Active", orders: 24, rating: 4.8 },
  { id: "GIG-002", title: "Modern UI/UX Design", freelancer: "Fatima Ali", freelancerId: "FRL-002", skill: "UI/UX Designer", price: 15000, priceUnit: "per project", status: "Active", orders: 18, rating: 4.9 },
  { id: "GIG-003", title: "WordPress Website from Scratch", freelancer: "Ayesha Malik", freelancerId: "FRL-004", skill: "WordPress Expert", price: 25000, priceUnit: "per project", status: "Active", orders: 32, rating: 4.7 },
  { id: "GIG-004", title: "Node.js Backend Development", freelancer: "Hassan Raza", freelancerId: "FRL-003", skill: "Node.js Developer", price: 4000, priceUnit: "per hour", status: "Pending", orders: 0, rating: 0 },
  { id: "GIG-005", title: "SEO Audit & Optimization", freelancer: "Imran Qureshi", freelancerId: "FRL-009", skill: "SEO Specialist", price: 20000, priceUnit: "per project", status: "Active", orders: 45, rating: 4.4 },
  { id: "GIG-006", title: "Professional Video Editing", freelancer: "Maria Farooq", freelancerId: "FRL-010", skill: "Video Editor", price: 8000, priceUnit: "per video", status: "Active", orders: 28, rating: 4.7 },
  { id: "GIG-007", title: "Creative Graphic Design", freelancer: "Sana Ahmed", freelancerId: "FRL-006", skill: "Graphic Designer", price: 3000, priceUnit: "per design", status: "Active", orders: 15, rating: 4.6 },
  { id: "GIG-008", title: "Flutter Mobile App Development", freelancer: "Bilal Hussain", freelancerId: "FRL-007", skill: "Mobile App Developer", price: 6000, priceUnit: "per hour", status: "Active", orders: 12, rating: 4.5 },
];

// ================== PRODUCTS ==================
let mockProducts = [
  { id: "PRD-001", title: "React Admin Dashboard Template", seller: "Ahmed Khan", sellerId: "FRL-001", price: 4999, category: "Templates", status: "Approved", sales: 156, rating: 4.7, createdAt: "2024-01-15" },
  { id: "PRD-002", title: "UI Kit - Modern Design System", seller: "Fatima Ali", sellerId: "FRL-002", price: 2999, category: "UI Kits", status: "Approved", sales: 89, rating: 4.8, createdAt: "2024-01-20" },
  { id: "PRD-003", title: "WordPress Theme - Business Pro", seller: "Ayesha Malik", sellerId: "FRL-004", price: 1999, category: "WordPress", status: "Approved", sales: 234, rating: 4.6, createdAt: "2024-01-10" },
  { id: "PRD-004", title: "Icon Pack - 500+ Icons", seller: "Sana Ahmed", sellerId: "FRL-006", price: 999, category: "Graphics", status: "Pending", sales: 0, rating: 0, createdAt: "2024-02-08" },
  { id: "PRD-005", title: "SEO Checklist & Guide", seller: "Imran Qureshi", sellerId: "FRL-009", price: 499, category: "Ebooks", status: "Approved", sales: 312, rating: 4.5, createdAt: "2024-01-05" },
  { id: "PRD-006", title: "Video Intro Templates Pack", seller: "Maria Farooq", sellerId: "FRL-010", price: 1499, category: "Video", status: "Under Review", sales: 0, rating: 0, createdAt: "2024-02-10" },
  { id: "PRD-007", title: "Flutter App Starter Kit", seller: "Bilal Hussain", sellerId: "FRL-007", price: 3999, category: "Templates", status: "Approved", sales: 67, rating: 4.4, createdAt: "2024-01-18" },
  { id: "PRD-008", title: "Social Media Graphics Bundle", seller: "Sana Ahmed", sellerId: "FRL-006", price: 799, category: "Graphics", status: "Rejected", sales: 0, rating: 0, createdAt: "2024-02-05" },
];

// ================== TRANSACTIONS ==================
let mockTransactions = [
  { id: "TXN-001", type: "Freelance Payment", projectId: "PRJ-001", from: "TechStart Solutions", to: "Ahmed Khan", amount: 45000, status: "Completed", paymentType: "30% Upfront", date: "2024-02-01" },
  { id: "TXN-002", type: "Product Sale", productId: "PRD-001", from: "Customer", to: "Ahmed Khan", amount: 4999, status: "Completed", paymentType: "100% Upfront", date: "2024-02-05" },
  { id: "TXN-003", type: "Withdrawal", from: "Platform", to: "Fatima Ali", amount: 50000, status: "Processing", paymentType: "Bank Transfer", date: "2024-02-08" },
  { id: "TXN-004", type: "Freelance Payment", projectId: "PRJ-002", from: "Digital Minds Agency", to: "Fatima Ali", amount: 24000, status: "Completed", paymentType: "30% Upfront", date: "2024-01-25" },
  { id: "TXN-005", type: "Product Sale", productId: "PRD-003", from: "Customer", to: "Ayesha Malik", amount: 1999, status: "Completed", paymentType: "100% Upfront", date: "2024-02-06" },
  { id: "TXN-006", type: "Withdrawal", from: "Platform", to: "Imran Qureshi", amount: 35000, status: "Completed", paymentType: "JazzCash", date: "2024-02-02" },
  { id: "TXN-007", type: "Freelance Payment", projectId: "PRJ-008", from: "EduTech Pakistan", to: "Bilal Hussain", amount: 60000, status: "Pending", paymentType: "30% Upfront", date: "2024-02-10" },
  { id: "TXN-008", type: "Refund", projectId: "PRJ-005", from: "Platform", to: "FoodieApp Inc", amount: 10500, status: "Completed", paymentType: "Dispute Resolution", date: "2024-02-09" },
];

// ================== DISPUTES ==================
let mockDisputes = [
  { id: "DSP-001", projectId: "PRJ-005", projectTitle: "Promotional Video Edit", client: "FoodieApp Inc", clientId: "CLT-006", freelancer: "Maria Farooq", freelancerId: "FRL-010", reason: "Quality not as expected", status: "Active", submittedEvidence: true, timeSpent: "15 hours", createdAt: "2024-02-09", amount: 35000 },
  { id: "DSP-002", projectId: "PRJ-003", projectTitle: "WordPress Blog Setup", client: "Saad Malik", clientId: "CLT-004", freelancer: "Ayesha Malik", freelancerId: "FRL-004", reason: "Delayed delivery", status: "Resolved", resolution: "Partial Refund", submittedEvidence: true, timeSpent: "8 hours", createdAt: "2024-02-05", resolvedAt: "2024-02-07", amount: 25000 },
  { id: "DSP-003", projectId: "PRJ-001", projectTitle: "E-commerce Website Development", client: "TechStart Solutions", clientId: "CLT-001", freelancer: "Ahmed Khan", freelancerId: "FRL-001", reason: "Scope disagreement", status: "Active", submittedEvidence: false, timeSpent: "45 hours", createdAt: "2024-02-10", amount: 150000 },
  { id: "DSP-004", projectId: "PRJ-007", projectTitle: "Logo Design Package", client: "Ali Enterprises", clientId: "CLT-003", freelancer: "Sana Ahmed", freelancerId: "FRL-006", reason: "Design not matching requirements", status: "Resolved", resolution: "Pay Freelancer", submittedEvidence: true, timeSpent: "6 hours", createdAt: "2024-02-03", resolvedAt: "2024-02-04", amount: 15000 },
];

// ================== SKILL TESTS ==================
let mockSkillTests = [
  { id: "TST-001", freelancerId: "FRL-001", freelancer: "Ahmed Khan", skill: "React Developer", status: "Passed", score: 92, takenAt: "2024-01-16", expiresAt: "2025-01-16" },
  { id: "TST-002", freelancerId: "FRL-002", freelancer: "Fatima Ali", skill: "UI/UX Designer", status: "Passed", score: 95, takenAt: "2024-01-21", expiresAt: "2025-01-21" },
  { id: "TST-003", freelancerId: "FRL-003", freelancer: "Hassan Raza", skill: "Node.js Developer", status: "Not Taken", score: null, takenAt: null, expiresAt: null },
  { id: "TST-004", freelancerId: "FRL-004", freelancer: "Ayesha Malik", skill: "WordPress Expert", status: "Passed", score: 88, takenAt: "2024-01-11", expiresAt: "2025-01-11" },
  { id: "TST-005", freelancerId: "FRL-005", freelancer: "Usman Shah", skill: "Python Developer", status: "Failed", score: 45, takenAt: "2024-02-06", expiresAt: null },
  { id: "TST-006", freelancerId: "FRL-008", freelancer: "Zara Khan", skill: "Content Writer", status: "Pending", score: null, takenAt: null, expiresAt: null },
];

// ================== RANKINGS ==================
let mockRankings = [
  { id: "RNK-001", freelancerId: "FRL-001", freelancer: "Ahmed Khan", skill: "React Developer", rank: 1, visibility: "High", priorityFor: "Large Projects", score: 98 },
  { id: "RNK-002", freelancerId: "FRL-002", freelancer: "Fatima Ali", skill: "UI/UX Designer", rank: 1, visibility: "High", priorityFor: "All Projects", score: 97 },
  { id: "RNK-003", freelancerId: "FRL-004", freelancer: "Ayesha Malik", skill: "WordPress Expert", rank: 2, visibility: "High", priorityFor: "Small Projects", score: 92 },
  { id: "RNK-004", freelancerId: "FRL-009", freelancer: "Imran Qureshi", skill: "SEO Specialist", rank: 1, visibility: "Medium", priorityFor: "All Projects", score: 89 },
  { id: "RNK-005", freelancerId: "FRL-007", freelancer: "Bilal Hussain", skill: "Mobile App Developer", rank: 3, visibility: "High", priorityFor: "Large Projects", score: 85 },
];

// ================== AI INSIGHTS ==================
let mockAIRecommendations = [
  { id: "AI-001", type: "Client Recommendation", clientId: "CLT-001", message: "Recommended Ahmed Khan for E-commerce project based on 92% skill match", freelancerSuggested: "Ahmed Khan", matchScore: 92, createdAt: "2024-02-01" },
  { id: "AI-002", type: "Client Recommendation", clientId: "CLT-002", message: "Recommended Fatima Ali for UI Design project based on portfolio quality", freelancerSuggested: "Fatima Ali", matchScore: 95, createdAt: "2024-01-25" },
  { id: "AI-003", type: "Pricing Guidance", freelancerId: "FRL-003", message: "Suggested hourly rate of PKR 3500-4500 based on market analysis", suggestedPrice: "PKR 3500-4500/hr", createdAt: "2024-02-02" },
  { id: "AI-004", type: "Skill Demand Alert", message: "React Native developers in high demand - 45% increase in job postings", skill: "React Native", demandChange: "+45%", createdAt: "2024-02-08" },
  { id: "AI-005", type: "Client Recommendation", clientId: "CLT-005", message: "Recommended Bilal Hussain for Flutter app development", freelancerSuggested: "Bilal Hussain", matchScore: 88, createdAt: "2024-02-01" },
];

let mockSkillDemand = [
  { skill: "React Developer", demand: 85, growth: "+15%", avgRate: 5000, openJobs: 45 },
  { skill: "UI/UX Designer", demand: 78, growth: "+12%", avgRate: 4500, openJobs: 38 },
  { skill: "Node.js Developer", demand: 72, growth: "+18%", avgRate: 4800, openJobs: 32 },
  { skill: "WordPress Expert", demand: 65, growth: "-5%", avgRate: 3000, openJobs: 28 },
  { skill: "Mobile App Developer", demand: 88, growth: "+25%", avgRate: 6000, openJobs: 52 },
  { skill: "Python Developer", demand: 70, growth: "+10%", avgRate: 4500, openJobs: 30 },
  { skill: "SEO Specialist", demand: 55, growth: "+8%", avgRate: 3500, openJobs: 22 },
  { skill: "Video Editor", demand: 62, growth: "+20%", avgRate: 4000, openJobs: 25 },
  { skill: "Graphic Designer", demand: 58, growth: "+5%", avgRate: 3200, openJobs: 35 },
  { skill: "Content Writer", demand: 50, growth: "+3%", avgRate: 2500, openJobs: 40 },
];

// ================== SYSTEM SETTINGS ==================
let mockSettings = {
  platformRules: {
    minProjectBudget: 5000,
    maxProjectBudget: 5000000,
    platformFee: 10,
    minWithdrawal: 1000,
    maxWithdrawal: 500000,
  },
  verificationRules: {
    requireCNIC: true,
    requirePortfolio: true,
    requireSkillTest: true,
    minPortfolioItems: 3,
    autoApproveVerified: false,
  },
  paymentRules: {
    freelanceUpfront: 30,
    productUpfront: 100,
    disputeHoldDays: 7,
    autoReleaseDays: 14,
    supportedMethods: ["JazzCash", "EasyPaisa", "Bank Transfer", "PayPal"],
  }
};

// ================== DASHBOARD STATS ==================
const getDashboardStats = () => ({
  totalFreelancers: mockFreelancers.length,
  verifiedFreelancers: mockFreelancers.filter(f => f.verificationStatus === "Verified").length,
  totalClients: mockClients.length,
  totalProjects: mockProjects.length,
  activeGigs: mockGigs.filter(g => g.status === "Active").length,
  digitalProducts: mockProducts.length,
  totalRevenue: mockTransactions.filter(t => t.status === "Completed").reduce((sum, t) => sum + t.amount, 0),
  activeDisputes: mockDisputes.filter(d => d.status === "Active").length,
});

const getChartData = () => ({
  freelancersVsClients: [
    { name: "Jan", freelancers: 45, clients: 28 },
    { name: "Feb", freelancers: 52, clients: 35 },
    { name: "Mar", freelancers: 61, clients: 42 },
    { name: "Apr", freelancers: 70, clients: 48 },
    { name: "May", freelancers: 78, clients: 55 },
    { name: "Jun", freelancers: 85, clients: 62 },
  ],
  monthlyProjects: [
    { name: "Jan", projects: 24 },
    { name: "Feb", projects: 32 },
    { name: "Mar", projects: 28 },
    { name: "Apr", projects: 45 },
    { name: "May", projects: 52 },
    { name: "Jun", projects: 48 },
  ],
  revenueBreakdown: [
    { name: "Freelance Services", value: 65, color: "#204ecf" },
    { name: "Digital Products", value: 25, color: "#10b981" },
    { name: "Platform Fees", value: 10, color: "#f59e0b" },
  ],
  skillDemand: mockSkillDemand.slice(0, 6),
});

// =====================================================
// SERVICE METHODS
// =====================================================

export const adminService = {
  // ================== DASHBOARD ==================
  getStats: async () => {
    await sleep(DELAY_MS);
    return { success: true, data: getDashboardStats() };
  },

  getChartData: async () => {
    await sleep(DELAY_MS);
    return { success: true, data: getChartData() };
  },

  // ================== FREELANCERS ==================
  getFreelancers: async (filter = "All") => {
    await sleep(DELAY_MS);
    let data = [...mockFreelancers];
    if (filter === "Verified") data = data.filter(f => f.verificationStatus === "Verified");
    if (filter === "Pending") data = data.filter(f => f.verificationStatus === "Pending");
    return { success: true, data };
  },

  getFreelancer: async (id) => {
    await sleep(DELAY_MS);
    const freelancer = mockFreelancers.find(f => f.id === id);
    return { success: !!freelancer, data: freelancer };
  },

  createFreelancer: async (freelancer) => {
    await sleep(DELAY_MS);
    const newFreelancer = { ...freelancer, id: `FRL-${String(mockFreelancers.length + 1).padStart(3, '0')}` };
    mockFreelancers.push(newFreelancer);
    return { success: true, data: newFreelancer };
  },

  updateFreelancer: async (id, updates) => {
    await sleep(DELAY_MS);
    const index = mockFreelancers.findIndex(f => f.id === id);
    if (index !== -1) {
      mockFreelancers[index] = { ...mockFreelancers[index], ...updates };
      return { success: true, data: mockFreelancers[index] };
    }
    return { success: false, message: "Freelancer not found" };
  },

  deleteFreelancer: async (id) => {
    await sleep(DELAY_MS);
    mockFreelancers = mockFreelancers.filter(f => f.id !== id);
    return { success: true, message: "Freelancer deleted" };
  },

  updateFreelancerVerification: async (id, status) => {
    await sleep(DELAY_MS);
    const index = mockFreelancers.findIndex(f => f.id === id);
    if (index !== -1) {
      mockFreelancers[index].verificationStatus = status;
      return { success: true, data: mockFreelancers[index] };
    }
    return { success: false };
  },

  // ================== CLIENTS ==================
  getClients: async (filter = "All") => {
    await sleep(DELAY_MS);
    let data = [...mockClients];
    if (filter !== "All") data = data.filter(c => c.status === filter);
    return { success: true, data };
  },

  getClient: async (id) => {
    await sleep(DELAY_MS);
    const client = mockClients.find(c => c.id === id);
    return { success: !!client, data: client };
  },

  createClient: async (client) => {
    await sleep(DELAY_MS);
    const newClient = { ...client, id: `CLT-${String(mockClients.length + 1).padStart(3, '0')}` };
    mockClients.push(newClient);
    return { success: true, data: newClient };
  },

  updateClient: async (id, updates) => {
    await sleep(DELAY_MS);
    const index = mockClients.findIndex(c => c.id === id);
    if (index !== -1) {
      mockClients[index] = { ...mockClients[index], ...updates };
      return { success: true, data: mockClients[index] };
    }
    return { success: false };
  },

  deleteClient: async (id) => {
    await sleep(DELAY_MS);
    mockClients = mockClients.filter(c => c.id !== id);
    return { success: true };
  },

  // ================== PROJECTS ==================
  getProjects: async (filter = "All") => {
    await sleep(DELAY_MS);
    let data = [...mockProjects];
    if (filter !== "All") data = data.filter(p => p.status === filter);
    return { success: true, data };
  },

  createProject: async (project) => {
    await sleep(DELAY_MS);
    const newProject = { ...project, id: `PRJ-${String(mockProjects.length + 1).padStart(3, '0')}` };
    mockProjects.push(newProject);
    return { success: true, data: newProject };
  },

  updateProject: async (id, updates) => {
    await sleep(DELAY_MS);
    const index = mockProjects.findIndex(p => p.id === id);
    if (index !== -1) {
      mockProjects[index] = { ...mockProjects[index], ...updates };
      return { success: true, data: mockProjects[index] };
    }
    return { success: false };
  },

  deleteProject: async (id) => {
    await sleep(DELAY_MS);
    mockProjects = mockProjects.filter(p => p.id !== id);
    return { success: true };
  },

  // ================== GIGS ==================
  getGigs: async (filter = "All") => {
    await sleep(DELAY_MS);
    let data = [...mockGigs];
    if (filter !== "All") data = data.filter(g => g.status === filter);
    return { success: true, data };
  },

  updateGig: async (id, updates) => {
    await sleep(DELAY_MS);
    const index = mockGigs.findIndex(g => g.id === id);
    if (index !== -1) {
      mockGigs[index] = { ...mockGigs[index], ...updates };
      return { success: true, data: mockGigs[index] };
    }
    return { success: false };
  },

  deleteGig: async (id) => {
    await sleep(DELAY_MS);
    mockGigs = mockGigs.filter(g => g.id !== id);
    return { success: true };
  },

  // ================== PRODUCTS ==================
  getProducts: async (filter = "All") => {
    await sleep(DELAY_MS);
    let data = [...mockProducts];
    if (filter !== "All") data = data.filter(p => p.status === filter);
    return { success: true, data };
  },

  updateProduct: async (id, updates) => {
    await sleep(DELAY_MS);
    const index = mockProducts.findIndex(p => p.id === id);
    if (index !== -1) {
      mockProducts[index] = { ...mockProducts[index], ...updates };
      return { success: true, data: mockProducts[index] };
    }
    return { success: false };
  },

  approveProduct: async (id) => {
    await sleep(DELAY_MS);
    const index = mockProducts.findIndex(p => p.id === id);
    if (index !== -1) {
      mockProducts[index].status = "Approved";
      return { success: true, data: mockProducts[index] };
    }
    return { success: false };
  },

  rejectProduct: async (id) => {
    await sleep(DELAY_MS);
    const index = mockProducts.findIndex(p => p.id === id);
    if (index !== -1) {
      mockProducts[index].status = "Rejected";
      return { success: true, data: mockProducts[index] };
    }
    return { success: false };
  },

  deleteProduct: async (id) => {
    await sleep(DELAY_MS);
    mockProducts = mockProducts.filter(p => p.id !== id);
    return { success: true };
  },

  // ================== TRANSACTIONS ==================
  getTransactions: async (type = "All") => {
    await sleep(DELAY_MS);
    let data = [...mockTransactions];
    if (type !== "All") data = data.filter(t => t.type === type);
    return { success: true, data };
  },

  getFreelancePayments: async () => {
    await sleep(DELAY_MS);
    return { success: true, data: mockTransactions.filter(t => t.type === "Freelance Payment") };
  },

  getProductPayments: async () => {
    await sleep(DELAY_MS);
    return { success: true, data: mockTransactions.filter(t => t.type === "Product Sale") };
  },

  getWithdrawals: async () => {
    await sleep(DELAY_MS);
    return { success: true, data: mockTransactions.filter(t => t.type === "Withdrawal") };
  },

  processWithdrawal: async (id, status) => {
    await sleep(DELAY_MS);
    const index = mockTransactions.findIndex(t => t.id === id);
    if (index !== -1) {
      mockTransactions[index].status = status;
      return { success: true, data: mockTransactions[index] };
    }
    return { success: false };
  },

  // ================== DISPUTES ==================
  getDisputes: async (status = "All") => {
    await sleep(DELAY_MS);
    let data = [...mockDisputes];
    if (status !== "All") data = data.filter(d => d.status === status);
    return { success: true, data };
  },

  resolveDispute: async (id, resolution) => {
    await sleep(DELAY_MS);
    const index = mockDisputes.findIndex(d => d.id === id);
    if (index !== -1) {
      mockDisputes[index].status = "Resolved";
      mockDisputes[index].resolution = resolution;
      mockDisputes[index].resolvedAt = new Date().toISOString().split('T')[0];
      return { success: true, data: mockDisputes[index] };
    }
    return { success: false };
  },

  // ================== SKILL TESTS ==================
  getSkillTests: async () => {
    await sleep(DELAY_MS);
    return { success: true, data: [...mockSkillTests] };
  },

  updateSkillTest: async (id, updates) => {
    await sleep(DELAY_MS);
    const index = mockSkillTests.findIndex(t => t.id === id);
    if (index !== -1) {
      mockSkillTests[index] = { ...mockSkillTests[index], ...updates };
      return { success: true, data: mockSkillTests[index] };
    }
    return { success: false };
  },

  // ================== RANKINGS ==================
  getRankings: async () => {
    await sleep(DELAY_MS);
    return { success: true, data: [...mockRankings] };
  },

  updateRanking: async (id, updates) => {
    await sleep(DELAY_MS);
    const index = mockRankings.findIndex(r => r.id === id);
    if (index !== -1) {
      mockRankings[index] = { ...mockRankings[index], ...updates };
      return { success: true, data: mockRankings[index] };
    }
    return { success: false };
  },

  // ================== AI INSIGHTS ==================
  getAIRecommendations: async () => {
    await sleep(DELAY_MS);
    return { success: true, data: [...mockAIRecommendations] };
  },

  getSkillDemand: async () => {
    await sleep(DELAY_MS);
    return { success: true, data: [...mockSkillDemand] };
  },

  // ================== SETTINGS ==================
  getSettings: async () => {
    await sleep(DELAY_MS);
    return { success: true, data: { ...mockSettings } };
  },

  updateSettings: async (category, updates) => {
    await sleep(DELAY_MS);
    if (mockSettings[category]) {
      mockSettings[category] = { ...mockSettings[category], ...updates };
      return { success: true, data: mockSettings[category] };
    }
    return { success: false };
  },

  // ================== LEGACY SUPPORT ==================
  getUsers: async (filter = "All") => {
    await sleep(DELAY_MS);
    const allUsers = [
      ...mockFreelancers.map(f => ({ ...f, role: "Freelancer" })),
      ...mockClients.map(c => ({ ...c, role: "Client", status: c.status === "Active" ? "Verified" : c.status })),
    ];
    let filteredUsers = allUsers;
    if (filter !== "All") {
      filteredUsers = allUsers.filter(user => user.role.toLowerCase() === filter.toLowerCase());
    }
    return { success: true, data: filteredUsers };
  },

  deleteUser: async (userId) => {
    await sleep(DELAY_MS);
    mockFreelancers = mockFreelancers.filter(f => f.id !== userId);
    mockClients = mockClients.filter(c => c.id !== userId);
    return { success: true, message: `User ${userId} deleted successfully.` };
  },

  getRevenueHistory: async () => {
    await sleep(DELAY_MS);
    return {
      success: true,
      data: [
        { name: "Jan", revenue: 340000, expenses: 124000 },
        { name: "Feb", revenue: 430000, expenses: 153980 },
        { name: "Mar", revenue: 520000, expenses: 189800 },
        { name: "Apr", revenue: 478000, expenses: 179080 },
        { name: "May", revenue: 589000, expenses: 218000 },
        { name: "Jun", revenue: 623000, expenses: 238000 },
      ]
    };
  },
};
