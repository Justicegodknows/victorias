import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: "list",
    use: {
        baseURL: "http://localhost:3000",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command: "npm run build && npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
            // Stub Supabase credentials so the server can boot for smoke tests.
            // Pages under test (landing, login, register) are public; the middleware
            // will get a null user from the fake Supabase and proceed normally.
            NEXT_PUBLIC_SUPABASE_URL:
                process.env.NEXT_PUBLIC_SUPABASE_URL ??
                "https://test-project.supabase.co",
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
                process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
                // Minimal well-formed JWT (anon role, far-future expiry) — not a real key
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.smoke_test_stub",
            SUPABASE_SERVICE_ROLE_KEY:
                process.env.SUPABASE_SERVICE_ROLE_KEY ??
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.smoke_test_stub",
        },
    },
});
