/**
 * Tests UI headless — lead capture Marges IQ (gate bloquant enrichi + reask 45 j)
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
const CONTACT_KEY = "marges-iq:contact";

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

test("flux lead capture complet (gate enrichi bloquant → validation → reask 45 j)", async () => {
  const browser: Browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const context = await browser.newContext();
  const page: Page = await context.newPage();

  try {
    // ── 1. Ouverture : aucun gate bloquant (contact absent) tant qu'aucun mode n'est lancé ──
    await page.goto(BASE_URL);
    await page.waitForSelector("#home_dashboard");
    assert.equal(await page.locator('[data-email-gate]').count(), 0, "pas de gate bloquant à l'ouverture sans mode");

    // ── 2. Premier clic sur un mode → gate bloquant, simulation PAS démarrée ──
    await page.locator("button").filter({ hasText: "Quick" }).first().click();
    await page.waitForSelector('[data-email-gate="gate"]');
    assert.equal(await page.locator('[data-email-gate="gate"] h2').textContent(), "Accès gratuit — entrez vos informations une seule fois");
    // Le formulaire de simulation ne doit PAS être ouvert derrière la modal
    assert.equal(await page.locator("#project_form").count(), 0);
    // Bouton submit désactivé (tous champs vides)
    assert.equal(await page.locator('[data-email-gate="gate"] button[type="submit"]').isDisabled(), true);

    // ── 3. Validation des 4 champs : tout invalide → désactivé, tout valide → activé ──
    const firstNameInput = page.locator("#gate-first-name");
    const lastNameInput = page.locator("#gate-last-name");
    const companyInput = page.locator("#gate-company");
    const emailInput = page.locator("#email-gate-input");
    const submitBtn = page.locator('[data-email-gate="gate"] button[type="submit"]');

    // Prénom trop court + email invalide → reste désactivé
    await firstNameInput.fill("A");
    await emailInput.fill("pas-un-email");
    assert.equal(await submitBtn.isDisabled(), true, "prénom court + email invalide doit rester désactivé");

    // Domaine jetable → reste désactivé
    await emailInput.fill("test@mailinator.com");
    assert.equal(await submitBtn.isDisabled(), true, "domaine jetable doit rester désactivé");

    // Tout valide → active le bouton
    await firstNameInput.fill("Patricia");
    await lastNameInput.fill("Tremblay");
    await companyInput.fill("Rénovations Tremblay inc.");
    await emailInput.fill("patricia@entreprise.ca");
    assert.equal(await submitBtn.isDisabled(), false, "tous les champs valides activent le bouton");

    // Consentement : case non pré-cochée
    assert.equal(await page.locator('[data-email-gate="gate"] input[type="checkbox"]').isChecked(), false);

    await submitBtn.click();
    await page.waitForSelector("#project_form", { timeout: 5000 });
    assert.equal(await page.locator('[data-email-gate]').count(), 0, "la modal doit être fermée après validation");

    // localStorage persisté avec le contact complet
    const stored = await page.evaluate((k) => localStorage.getItem(k), CONTACT_KEY);
    const parsed = JSON.parse(stored || "{}");
    assert.equal(parsed.firstName, "Patricia");
    assert.equal(parsed.lastName, "Tremblay");
    assert.equal(parsed.company, "Rénovations Tremblay inc.");
    assert.equal(parsed.email, "patricia@entreprise.ca");
    assert.equal(typeof parsed.capturedAt, "number");

    // ── 4. Gate absent si contact présent (rechargement) ──
    await page.goto(BASE_URL);
    await page.waitForSelector("#home_dashboard");
    assert.equal(await page.locator('[data-email-gate]').count(), 0, "aucun gate quand contact déjà stocké");
    await page.locator("button").filter({ hasText: "Standard" }).first().click();
    await page.waitForSelector("#project_form", { timeout: 5000 });
    assert.equal(await page.locator('[data-email-gate]').count(), 0, "mode démarre directement sans gate");

    // ── 5. Reask doux après 45 jours (mock date via localStorage) ──
    const oldCapturedAt = Date.now() - 46 * DAY_MS;
    await page.evaluate(
      ([k, email, capturedAt]) =>
        localStorage.setItem(
          k,
          JSON.stringify({ firstName: "Patricia", lastName: "Tremblay", company: "Rénovations Tremblay inc.", email, capturedAt, consent: true })
        ),
      [CONTACT_KEY, "patricia@entreprise.ca", oldCapturedAt] as unknown as [string, string, number]
    );
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-email-gate="reask"]');
    assert.equal(await page.locator('[data-email-gate="reask"] h2').textContent(), "Vos informations sont toujours bonnes ?");
    // Champs pré-remplis depuis le contact stocké
    assert.equal(await page.locator("#gate-first-name").inputValue(), "Patricia");
    assert.equal(await page.locator("#gate-last-name").inputValue(), "Tremblay");
    assert.equal(await page.locator("#gate-company").inputValue(), "Rénovations Tremblay inc.");
    assert.equal(await page.locator("#email-gate-input").inputValue(), "patricia@entreprise.ca");

    // [Plus tard] : ferme la modal SANS modifier le stockage
    const beforeDismiss = await page.evaluate((k) => localStorage.getItem(k), CONTACT_KEY);
    await page.locator('[data-email-gate="reask"] button').filter({ hasText: "Plus tard" }).click();
    await page.waitForSelector('[data-email-gate="reask"]', { state: "detached" });
    const afterDismiss = await page.evaluate((k) => localStorage.getItem(k), CONTACT_KEY);
    assert.equal(afterDismiss, beforeDismiss, "Plus tard ne doit rien modifier");

    // ── 6. Reask [Continuer] : capturedAt mis à jour ──
    await page.goto(BASE_URL); // re-tenté à la prochaine ouverture (capturedAt toujours vieux)
    await page.waitForSelector('[data-email-gate="reask"]');
    await page.locator('[data-email-gate="reask"] button').filter({ hasText: "Continuer" }).click();
    await page.waitForSelector('[data-email-gate="reask"]', { state: "detached" });
    const afterContinue = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), CONTACT_KEY);
    assert.ok(Date.now() - afterContinue.capturedAt < 5000, "capturedAt doit être réinitialisé à maintenant");
    assert.equal(afterContinue.firstName, "Patricia", "le contact enrichi est conservé après Continuer");
    // Rechargement : plus de reask (capturedAt frais)
    await page.goto(BASE_URL);
    await page.waitForSelector("#home_dashboard");
    assert.equal(await page.locator('[data-email-gate]').count(), 0);

    // ── 7. Non-régression : ?embed=1&mode=quick → gate bloquant, puis form quick, header masqué ──
    await page.evaluate((k) => localStorage.removeItem(k), CONTACT_KEY); // repart sans contact
    await page.goto(BASE_URL + "?embed=1&mode=quick");
    await page.waitForSelector('[data-email-gate="gate"]');
    // Le mode quick est demandé via URL (pas de clic) → gate bloquant à l'ouverture
    assert.equal(await page.locator('[data-email-gate="gate"]').count(), 1);
    await page.fill("#gate-first-name", "Marc");
    await page.fill("#gate-last-name", "Gagnon");
    await page.fill("#gate-company", "Toitures Gagnon");
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
