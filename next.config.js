const { hostname } = new URL(process.env.SALEOR_API_URL);

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	images: {
		domains: [hostname],
	},
};

module.exports = nextConfig;
