/**
 * SkillKart – Central Policy Data Model
 * All dynamic content for Privacy Policy, Terms of Service, and Cookie Policy
 * lives here. Update this file whenever legal details change.
 */

export const policyState = {
    companyName: 'SkillKart',
    websiteUrl: 'https://skillkart.app',
    contactEmail: 'legal@skillkart.app',
    supportEmail: 'support@skillkart.com',
    jurisdiction: 'Pakistan (governed by applicable Pakistani law)',
    governingLaw: 'Pakistan',
    effectiveDate: 'February 25, 2026',
    lastUpdated: 'February 25, 2026',

    dataCategories: [
        'Account & identity information (name, email, university affiliation)',
        'Profile & portfolio content you create',
        'Project and transaction records',
        'AI-generated skill verification data',
        'Payment metadata (processed via Stripe – card details never stored by us)',
        'API request logs & session records (method, path, status, IP address, user agent — never request contents)',
        'Device and browser information',
        'Communications and support messages',
    ],

    // Only services the platform actually integrates (see Backend/src/services
    // and Front-end/src): keep this list in step with the code.
    thirdPartyPartners: [
        { name: 'Stripe', purpose: 'Secure payment processing, wallet top-ups and freelancer payouts' },
        { name: 'AI providers (Google Gemini, DeepSeek, Alibaba Qwen, Groq, Anthropic)', purpose: 'Buddy AI, proposal drafting, cost estimation and skill-test features' },
        { name: 'Vercel / Railway / MongoDB Atlas', purpose: 'Cloud hosting, infrastructure and database' },
        { name: 'Cloudinary', purpose: 'Storage and delivery of profile images, portfolio items and attachments' },
        { name: 'Google (reCAPTCHA, Gmail, Firebase)', purpose: 'Bot protection, transactional email delivery and Android push notifications' },
        { name: 'Supabase', purpose: 'Optional social sign-in (Google, LinkedIn, GitHub)' },
    ],

    retentionPeriods: {
        accountData: '5 years after account deletion',
        transactionRecords: '7 years (tax & financial regulations)',
        sessionLogs: '90 days',
        supportMessages: '2 years',
    },

    // SkillKart sets no analytics or advertising cookies. Your sign-in session
    // and a few preferences live in your browser's own storage (names below).
    cookieCategories: [
        {
            type: 'Strictly Necessary',
            purpose: 'Keeping you signed in and your session secure. Administrators additionally use a secure, HTTP-only cookie.',
            examples: ['at', 'rt', 'admin_token'],
            duration: 'Per tab / until you sign out',
            canOptOut: false,
        },
        {
            type: 'Functional',
            purpose: 'Remembering your cookie choice, an unfinished onboarding form, and your guest Buddy AI message count',
            examples: ['cookieConsent', 'freelancer_onboarding_draft', 'buddyGuestUsed'],
            duration: 'Until you clear your browser data',
            canOptOut: true,
        },
    ],
};
