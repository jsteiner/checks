import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	test: {
		include: ["src/**/*.{test.ts,test.tsx}"],
		reporters: ['dot'],
		testTimeout: 10000,
		coverage: {
			provider: "v8",
			exclude: ["src/**/*.{test.ts,test.tsx}", "src/test/helpers/**"],
			thresholds: {
				lines: 85,
				branches: 85,
				functions: 85,
			},
		},
	},
});
