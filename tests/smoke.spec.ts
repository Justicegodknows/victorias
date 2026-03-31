import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
    test("landing page loads with hero content", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveTitle(/Victoria/i);
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
            "Find your perfect apartment"
        );
        await expect(page.getByText("AI-Powered Apartment Finder", { exact: true })).toBeVisible();
        await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
    });

    test("landing page shows feature cards", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByText("How Victoria helps you")).toBeVisible();
        await expect(page.getByText("Chat with AI")).toBeVisible();
        await expect(page.getByText("True Cost Breakdown")).toBeVisible();
        await expect(page.getByText("Neighborhood Intelligence")).toBeVisible();
    });

    test("landing page shows city section", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByText("Available in 3 major cities")).toBeVisible();
        await expect(page.getByRole("heading", { name: "Lagos" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Abuja" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Port Harcourt" })).toBeVisible();
    });

    test("landing page shows landlord CTA", async ({ page }) => {
        await page.goto("/");
        await expect(
            page.getByRole("heading", { name: /are you a landlord/i })
        ).toBeVisible();
    });
});

test.describe("Auth pages", () => {
    test("login page loads with form", async ({ page }) => {
        await page.goto("/login");
        await expect(
            page.getByRole("heading", { name: /welcome back/i })
        ).toBeVisible();
        await expect(page.getByText("Sign in to find your perfect apartment")).toBeVisible();
        await expect(page.getByRole("button", { name: /email/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /phone/i })).toBeVisible();
        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test("register page loads with form", async ({ page }) => {
        await page.goto("/register");
        await expect(
            page.getByRole("heading", { name: /create your account/i })
        ).toBeVisible();
        await expect(page.getByText("Find an apartment")).toBeVisible();
        await expect(page.getByText("List apartments", { exact: true })).toBeVisible();
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
        const response = await request.post("/api/auth/signout");
        // Should not 404 — it may redirect or return success
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
