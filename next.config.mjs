/** @type {import('next').NextConfig} */
const config = { poweredByHeader: false, serverExternalPackages: ['sanitize-html'], cleanDistDir: process.env.NEXT_KEEP_BUILD_DIR !== 'true' };
export default config;
