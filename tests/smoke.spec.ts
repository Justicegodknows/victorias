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
