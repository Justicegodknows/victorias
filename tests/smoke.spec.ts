import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
    test("landing page loads with hero content", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveTitle(/Victoria/i);
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
            "Find a house"
        );
        await expect(
            page.getByText("Trusted In Lagos, Abuja & Port Harcourt", {
                exact: true,
            }),
        ).toBeVisible();
        await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
    });

    test("landing page shows featured property cards", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByText("Handpicked for your lifestyle")).toBeVisible();
        await expect(page.getByText("Luxury Villa in Maitama")).toBeVisible();
        await expect(page.getByText("Modern Apartment in Lekki")).toBeVisible();
        await expect(page.getByText("Waterfront Home in GRA")).toBeVisible();
    });

    test("landing page shows search summary", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByText("Lagos, Abuja, Port Harcourt")).toBeVisible();
        await expect(page.getByText("Apartments, Duplex, Mini-flat")).toBeVisible();
        await expect(page.getByText("N500,000 - N15,000,000")).toBeVisible();
    });

    test("landing page shows landlord CTA", async ({ page }) => {
        await page.goto("/");
        await expect(
            page.getByRole("heading", {
                name: /list your property and reach verified tenants faster/i,
            })
        ).toBeVisible();
    });
});

test.describe("Auth pages", () => {
    test("login page loads with form", async ({ page }) => {
        await page.goto("/login");
        await expect(page.getByRole("button", { name: /email/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /phone otp/i })).toBeVisible();
        await expect(page.getByLabel("Email Address")).toBeVisible();
        await expect(page.getByLabel("Password")).toBeVisible();
        await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    });

    test("register page loads with form", async ({ page }) => {
        await page.goto("/register");
        await expect(page.getByRole("heading", { name: /choose your role/i })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Tenant" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Landlord" })).toBeVisible();
        await expect(page.getByLabel("Full Name")).toBeVisible();
        await expect(page.getByLabel("Email Address")).toBeVisible();
        await expect(page.getByLabel("Phone Number")).toBeVisible();
    });

    test("register requires phone before submit", async ({ page }) => {
        await page.goto("/register");

        await page.getByRole("button", { name: "Landlord" }).click();
        await page.getByLabel("Full Name").fill("Test Landlord");
        await page.getByLabel("Email Address").fill("test.landlord@example.com");
        await page.getByLabel("Password").fill("securepassword123");

        await page.getByRole("button", { name: /create account/i }).click();

        const phoneInput = page.getByLabel("Phone Number");
        await expect(phoneInput).toBeFocused();

        const isValid = await phoneInput.evaluate((el) =>
            (el as HTMLInputElement).checkValidity()
        );
        expect(isValid).toBe(false);

        const validationMessage = await phoneInput.evaluate((el) =>
            (el as HTMLInputElement).validationMessage
        );
        expect(validationMessage.length).toBeGreaterThan(0);
    });

    test("login page has link to register", async ({ page }) => {
        await page.goto("/login");
        const registerLink = page.getByRole("link", { name: /create.*account|sign up|register/i });
        await expect(registerLink).toBeVisible();
    });

    test("register page has link to login", async ({ page }) => {
        await page.goto("/register");
        const loginLink = page.getByRole("link", { name: /sign in|log in/i });
        await expect(loginLink).toBeVisible();
    });
});

test.describe("Protected routes redirect when unauthenticated", () => {
    test("tenant dashboard redirects to login", async ({ page }) => {
        await page.goto("/tenant");
        await page.waitForURL("**/login**");
        expect(page.url()).toContain("/login");
    });

    test("tenant browse redirects to login", async ({ page }) => {
        await page.goto("/tenant/browse");
        await page.waitForURL("**/login**");
        expect(page.url()).toContain("/login");
    });

    test("tenant saved redirects to login", async ({ page }) => {
        await page.goto("/tenant/saved");
        await page.waitForURL("**/login**");
        expect(page.url()).toContain("/login");
    });

    test("landlord dashboard redirects to login", async ({ page }) => {
        await page.goto("/landlord");
        await page.waitForURL("**/login**");
        expect(page.url()).toContain("/login");
    });

    test("landlord new listing redirects to login", async ({ page }) => {
        await page.goto("/landlord/listings/new");
        await page.waitForURL("**/login**");
        expect(page.url()).toContain("/login");
    });

    test("landlord inquiries redirects to login", async ({ page }) => {
        await page.goto("/landlord/inquiries");
        await page.waitForURL("**/login**");
        expect(page.url()).toContain("/login");
    });
});

test.describe("API routes", () => {
    test("chat API rejects unauthenticated requests", async ({ request }) => {
        const response = await request.post("/api/chat", {
            data: { messages: [{ role: "user", content: "hello" }] },
        });
        // Should return 401 or redirect — not 200
        expect(response.status()).not.toBe(200);
    });

    test("signout API route exists", async ({ request }) => {
        const response = await request.post("/api/auth/signout", {
            maxRedirects: 0,
        });
        expect(response.status()).not.toBe(404);
    });
});

test.describe("Navigation", () => {
    test("landing page Get Started link goes to register", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("link", { name: /get started/i }).click();
        await page.waitForURL("**/register**");
        expect(page.url()).toContain("/register");
    });

    test("landing page Sign in link goes to login", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("link", { name: /sign in/i }).first().click();
        await page.waitForURL("**/login**");
        expect(page.url()).toContain("/login");
    });
});

test.describe("Chat UI", () => {
    test("chat page redirects unauthenticated users to login", async ({ page }) => {
        await page.goto("/landlord/chat");
        await page.waitForURL("**/login**");
        expect(page.url()).toContain("/login");
    });
});

// ── Authenticated Chat UI tests ─────────────────────────────────────────
// Require TEST_USER_EMAIL and TEST_USER_PASSWORD env vars pointing at a
// real landlord account in the connected Supabase instance.
const hasTestUser = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);

test.describe("Chat UI (authenticated)", () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasTestUser, "Requires TEST_USER_EMAIL and TEST_USER_PASSWORD env vars");

        // Log in via the UI
        await page.goto("/login");
        await page.getByLabel("Email Address").fill(process.env.TEST_USER_EMAIL!);
        await page.getByLabel("Password").fill(process.env.TEST_USER_PASSWORD!);
        await page.getByRole("button", { name: /sign in/i }).click();
        await page.waitForURL("**/landlord**");
    });

    test("chat page renders Victoria greeting and suggestions", async ({ page }) => {
        await page.goto("/landlord/chat");
        await expect(page.getByText("Hi! I\u2019m Victoria")).toBeVisible();
        await expect(
            page.getByText("Your premium AI apartment curator"),
        ).toBeVisible();

        // All four suggestion buttons should be visible
        await expect(page.getByRole("button", { name: /Lekki/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /Yaba/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /Abuja/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /expats/i })).toBeVisible();
    });

    test("chat page has message input and send button", async ({ page }) => {
        await page.goto("/landlord/chat");
        await expect(
            page.getByPlaceholder("Message Victoria..."),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: /send message/i }),
        ).toBeVisible();
    });

    test("send button is disabled when input is empty", async ({ page }) => {
        await page.goto("/landlord/chat");
        const sendBtn = page.getByRole("button", { name: /send message/i });
        await expect(sendBtn).toBeDisabled();
    });

    test("send button enables when text is entered", async ({ page }) => {
        await page.goto("/landlord/chat");
        await page.getByPlaceholder("Message Victoria...").fill("Hello");
        const sendBtn = page.getByRole("button", { name: /send message/i });
        await expect(sendBtn).toBeEnabled();
    });

    test("chat page shows disclaimer", async ({ page }) => {
        await page.goto("/landlord/chat");
        await expect(
            page.getByText(/verify critical info/i),
        ).toBeVisible();
    });

    test("navigation sidebar has AI Chat link", async ({ page }) => {
        await page.goto("/landlord/chat");
        await expect(page.getByRole("link", { name: /ai chat/i }).first()).toBeVisible();
    });
});
