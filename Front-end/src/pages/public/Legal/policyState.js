/**
 * SkillKart – Central Policy Data Model
 * All dynamic content for Privacy Policy, Terms of Service, and Cookie Policy
 * lives here. Update this file whenever legal details change.
 */

export const policyState = {
    companyName: 'SkillKart',
    websiteUrl: 'https://skillkart.app',
    contactEmail: 'legal@skillkart.app',
    supportEmail: 'support@skillkart.app',
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
        'Usage analytics & session logs',
        'Device and browser information',
        'Communications and support messages',
    ],

    thirdPartyPartners: [
        { name: 'Stripe', purpose: 'Secure payment processing & escrow' },
        { name: 'OpenAI', purpose: 'Buddy AI and skill-analysis features' },
        { name: 'Google Analytics', purpose: 'Anonymised usage analytics' },
        { name: 'Vercel / Railway', purpose: 'Cloud hosting & infrastructure' },
        { name: 'Cloudflare', purpose: 'CDN, DDoS protection, performance' },
    ],

    retentionPeriods: {
        accountData: '5 years after account deletion',
        transactionRecords: '7 years (tax & financial regulations)',
        sessionLogs: '90 days',
        supportMessages: '2 years',
        analyticsData: '26 months (anonymised)',
    },

    cookieCategories: [
        {
            type: 'Strictly Necessary',
            purpose: 'Authentication, CSRF protection, session management',
            examples: ['auth_token', 'csrf_token', 'session_id'],
            duration: 'Session / 30 days',
            canOptOut: false,
        },
        {
            type: 'Functional',
            purpose: 'User preferences, language, theme, saved filters',
            examples: ['user_prefs', 'locale', 'dark_mode'],
            duration: 'Up to 1 year',
            canOptOut: true,
        },
        {
            type: 'Analytics',
            purpose: 'Google Analytics – anonymised traffic & behaviour data',
            examples: ['_ga', '_gid', '_gat'],
            duration: 'Up to 26 months',
            canOptOut: true,
        },
        {
            type: 'Marketing',
            purpose: 'Retargeting ads, campaign attribution (disabled by default)',
            examples: ['fbp', 'ttclid'],
            duration: 'Up to 90 days',
            canOptOut: true,
        },
    ],
};
