/** [GGL] Googlebot preamble for Merchant Center landing-page crawl. */
const GOOGLEBOT_PREAMBLE = `# Merchant Center / Google Shopping — явный доступ краулерам Google
User-agent: Googlebot
Allow: /

User-agent: Googlebot-Image
Allow: /

User-agent: AdsBot-Google
Allow: /
`;

module.exports = { GOOGLEBOT_PREAMBLE };
