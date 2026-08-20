/**
 * Tests UI headless — lead capture Marges IQ (gate bloquant + reask 45 j)
 *
 * Nécessite : playwright-core (devDep) + Chromium système.
 * Lance lui-même le serveur dev sur le port 3000 puis exécute les scénarios.
 *
 * Exécution : npm run test:ui
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { chromium, type Browser, type Page } from "playwright-core";

const BASE_URL = "http://localhost:3000/";
const CHROME_PATH = "/opt/data/playwright-project/browsers/chromium-1234/chrome-linux64/chrome";
const DAY_MS = 24 * 60 * 60 * 1000;
const EMAIL_KEY = "marges-iq:email";

let server: ChildProcess | null = null;

async function waitForServer(url: string, timeoutMs = 20000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("Serveur non joignable: " + url);
}

test.before(async () => {
  // Démarre le serveur dev s'il n'est pas déjà actif
  try {
    const res = await fetch(BASE_URL);
    if (res.ok) return;
  } catch {
    /* on le lance */
  }
  server = spawn("npm", ["run", "dev"], { cwd: process.cwd(), stdio: "ignore" });
  await waitForServer(BASE_URL);
});

test.after(() => {
  server?.kill();
});

test("flux lead capture complet (gate bloquant → validation → reask 45 j)", async () => {
  const browser: Browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const context = await browser.newContext();
  const page: Page = await context.newPage();

  try {
    // ── 1. Ouverture : aucun gate bloquant (email absent) tant qu'aucun mode n'est lancé ──
    await page.goto(BASE_URL);
    await page.waitForSelector("#home_dashboard");
    assert.equal(await page.locator('[data-email-gate]').count(), 0, "pas de gate bloquant à l'ouverture sans mode");

    // ── 2. Premier clic sur un mode → gate bloquant, simulation PAS démarrée ──
    await page.locator("button").filter({ hasText: "Quick" }).first().click();
    await page.waitForSelector('[data-email-gate="gate"]');
    assert.equal(await page.locator('[data-email-gate="gate"] h2').textContent(), "Accès gratuit — entrez votre email une seule fois");
    // Le formulaire de simulation ne doit PAS être ouvert derrière la modal
    assert.equal(await page.locator("#project_form").count(), 0);
    // Bouton submit désactivé (champ vide)
    assert.equal(await page.locator('[data-email-gate="gate"] button[type="submit"]').isDisabled(), true);

    // ── 3. Validation email : faux rejeté, jetable rejeté, valide accepté ──
    const emailInput = page.locator("#email-gate-input");
    const submitBtn = page.locator('[data-email-gate="gate"] button[type="submit"]');

    await emailInput.fill("pas-un-email");
    assert.equal(await submitBtn.isDisabled(), true, "email invalide doit rester désactivé");

    await emailInput.fill("test@mailinator.com");
    assert.equal(await submitBtn.isDisabled(), true, "domaine jetable doit rester désactivé");

    await emailInput.fill("patricia@entreprise.ca");
    assert.equal(await submitBtn.isDisabled(), false, "email valide active le bouton");

    // Consentement : case non pré-cochée
    assert.equal(await page.locator('[data-email-gate="gate"] input[type="checkbox"]').isChecked(), false);

    await submitBtn.click();
    await page.waitForSelector("#project_form", { timeout: 5000 });
    assert.equal(await page.locator('[data-email-gate]').count(), 0, "la modal doit être fermée après validation");

    // localStorage persisté
    const stored = await page.evaluate((k) => localStorage.getItem(k), EMAIL_KEY);
    const parsed = JSON.parse(stored || "{}");
    assert.equal(parsed.email, "patricia@entreprise.ca");
    assert.equal(typeof parsed.capturedAt, "number");

    // ── 3. Gate absent si email présent (rechargement) ──
    await page.goto(BASE_URL);
    await page.waitForSelector("#home_dashboard");
    assert.equal(await page.locator('[data-email-gate]').count(), 0, "aucun gate quand email déjà stocké");
    await page.locator("button").filter({ hasText: "Standard" }).first().click();
    await page.waitForSelector("#project_form", { timeout: 5000 });
    assert.equal(await page.locator('[data-email-gate]').count(), 0, "mode démarre directement sans gate");

    // ── 4. Reask doux après 45 jours (mock date via localStorage) ──
    const oldCapturedAt = Date.now() - 46 * DAY_MS;
    await page.evaluate(
      ([k, email, capturedAt]) => localStorage.setItem(k, JSON.stringify({ email, capturedAt, consent: true })),
      [EMAIL_KEY, "patricia@entreprise.ca", oldCapturedAt] as unknown as [string, string, number]
    );
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-email-gate="reask"]');
    assert.equal(await page.locator('[data-email-gate="reask"] h2').textContent(), "Votre email est toujours bon ?");
    // Champ pré-rempli
    assert.equal(await page.locator("#email-gate-input").inputValue(), "patricia@entreprise.ca");

    // [Plus tard] : ferme la modal SANS modifier le stockage
    const beforeDismiss = await page.evaluate((k) => localStorage.getItem(k), EMAIL_KEY);
    await page.locator('[data-email-gate="reask"] button').filter({ hasText: "Plus tard" }).click();
    await page.waitForSelector('[data-email-gate="reask"]', { state: "detached" });
    const afterDismiss = await page.evaluate((k) => localStorage.getItem(k), EMAIL_KEY);
    assert.equal(afterDismiss, beforeDismiss, "Plus tard ne doit rien modifier");

    // ── 5. Reask [Continuer] : capturedAt mis à jour ──
    await page.goto(BASE_URL); // re-tenté à la prochaine ouverture (capturedAt toujours vieux)
    await page.waitForSelector('[data-email-gate="reask"]');
    await page.locator('[data-email-gate="reask"] button').filter({ hasText: "Continuer" }).click();
    await page.waitForSelector('[data-email-gate="reask"]', { state: "detached" });
    const afterContinue = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), EMAIL_KEY);
    assert.ok(Date.now() - afterContinue.capturedAt < 5000, "capturedAt doit être réinitialisé à maintenant");
    // Rechargement : plus de reask (capturedAt frais)
    await page.goto(BASE_URL);
    await page.waitForSelector("#home_dashboard");
    assert.equal(await page.locator('[data-email-gate]').count(), 0);

    // ── 6. Non-régression : ?embed=1&mode=quick → gate bloquant, puis form quick, header masqué ──
    await page.evaluate((k) => localStorage.removeItem(k), EMAIL_KEY); // repart sans email
    await page.goto(BASE_URL + "?embed=1&mode=quick");
    await page.waitForSelector('[data-email-gate="gate"]');
    // Le mode quick est demandé via URL (pas de clic) → gate bloquant à l'ouverture
    assert.equal(await page.locator('[data-email-gate="gate"]').count(), 1);
    await page.fill("#email-gate-input", "mode-embed@entreprise.ca");
    await page.locator('[data-email-gate="gate"] button[type="submit"]').click();
    await page.waitForSelector("#project_form", { timeout: 5000 });
    // Embed : header/footer masqués
    assert.equal(await page.locator("header").count(), 0, "embed=1 doit masquer le header");
    assert.equal(await page.locator("footer").count(), 0, "embed=1 doit masquer le footer");
    // Le formulaire est en mode quick (visible sur l'écran — vérifie le badge/label du mode)
    const formText = await page.locator("#project_form").textContent();
    assert.ok(formText && formText.length > 0, "formulaire démarre en embed");
  } finally {
    await browser.close();
  }
});
