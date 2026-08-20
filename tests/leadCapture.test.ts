/**
 * Tests headless — lead capture (gate email + reask 45 j)
 *
 * Exécution : npm test  (tsx --test tests/*.test.ts)
 * Logique pure testée sans DOM ; localStorage et Date mockés par injection.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  EMAIL_STORAGE_KEY,
  REASK_AFTER_MS,
  isValidEmail,
  normalizeEmail,
  shouldShowGate,
  shouldShowReask,
  getStoredEmail,
  saveEmail,
  buildLeadPayload,
  sendLeadToWebhook,
  StoredEmail,
} from "../src/lib/leadCapture";

/** Mock localStorage minimal conforme à Pick<Storage, ...>. */
function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    _map: map,
  };
}

const VALID = "patricia@entreprise.ca";
const DAY_MS = 24 * 60 * 60 * 1000;

// ── Validation email ──────────────────────────────────────────────

test("validation email : format valide accepté", () => {
  assert.equal(isValidEmail("patricia@entreprise.ca"), true);
  assert.equal(isValidEmail("user.name+tag@entreprise.com"), true);
  assert.equal(isValidEmail("  a@b.co  "), true); // trim
  assert.equal(isValidEmail("USER@CASe.com"), true); // case insensible
});

test("validation email : formats invalides rejetés", () => {
  assert.equal(isValidEmail(""), false);
  assert.equal(isValidEmail("abc"), false);
  assert.equal(isValidEmail("a@"), false);
  assert.equal(isValidEmail("@b.ca"), false);
  assert.equal(isValidEmail("a b@c.ca"), false);
  assert.equal(isValidEmail("a@b"), false); // pas de TLD
  assert.equal(isValidEmail("a@b."), false);
  assert.equal(isValidEmail("a".repeat(300) + "@b.ca"), false); // trop long
});

test("validation email : domaines jetables (blocklist) rejetés", () => {
  assert.equal(isValidEmail("test@mailinator.com"), false);
  assert.equal(isValidEmail("test@yopmail.fr"), false);
  assert.equal(isValidEmail("test@10minutemail.com"), false);
  assert.equal(isValidEmail("test@mail.mailinator.com"), false); // sous-domaine
  assert.equal(isValidEmail("test@trashmail.me"), false);
});

test("normalizeEmail : trim + minuscules", () => {
  assert.equal(normalizeEmail("  Patricia@Entreprise.CA "), "patricia@entreprise.ca");
});

// ── Gate (1re fois, bloquant) ─────────────────────────────────────

test("gate au 1er clic mode : aucun email stocké → gate requis", () => {
  assert.equal(shouldShowGate(null), true);
});

test("gate absent si email présent et valide", () => {
  const stored: StoredEmail = { email: VALID, capturedAt: Date.now(), consent: false };
  assert.equal(shouldShowGate(stored), false);
});

test("gate requis si email stocké invalide (corrompu)", () => {
  const stored: StoredEmail = { email: "pas-un-email", capturedAt: Date.now(), consent: false };
  assert.equal(shouldShowGate(stored), true);
});

// ── Reask doux 45 jours ───────────────────────────────────────────

test("reask après 45 jours (mock date) : déclenché", () => {
  const now = 1_800_000_000_000;
  const stored: StoredEmail = { email: VALID, capturedAt: now - (46 * DAY_MS), consent: true };
  assert.equal(shouldShowReask(stored, now), true);
});

test("reask AVANT 45 jours : pas déclenché", () => {
  const now = 1_800_000_000_000;
  const stored: StoredEmail = { email: VALID, capturedAt: now - (44 * DAY_MS), consent: true };
  assert.equal(shouldShowReask(stored, now), false);
});

test("reask à exactement 45 jours : déclenché (>= seuil)", () => {
  const now = 1_800_000_000_000;
  const stored: StoredEmail = { email: VALID, capturedAt: now - REASK_AFTER_MS, consent: true };
  assert.equal(shouldShowReask(stored, now), true);
});

test("reask sans email stocké : jamais déclenché", () => {
  assert.equal(shouldShowReask(null, Date.now()), false);
});

// ── Modal doux fermable ([Plus tard] = aucun changement) ──────────

test("dismiss du reask ne modifie pas le stockage → re-tenté à la prochaine ouverture", () => {
  const storage = makeStorage({
    [EMAIL_STORAGE_KEY]: JSON.stringify({ email: VALID, capturedAt: 1_000_000_000, consent: true }),
  });
  const stored = getStoredEmail(storage as unknown as Storage);
  // [Plus tard] ne fait AUCUN save : on vérifie que la donnée reste inchangée...
  const before = storage.getItem(EMAIL_STORAGE_KEY);
  // ...et que le reask est toujours dû à la prochaine ouverture.
  assert.equal(shouldShowReask(stored, Date.now()), true);
  assert.equal(storage.getItem(EMAIL_STORAGE_KEY), before);
});

// ── Persistance localStorage ──────────────────────────────────────

test("saveEmail : persiste { email, capturedAt, consent } sous marges-iq:email", () => {
  const storage = makeStorage();
  const capturedAt = 1_700_000_000_000;
  const saved = saveEmail("  A@B.ca ", true, capturedAt, storage as unknown as Storage);
  assert.deepEqual(saved, { email: "a@b.ca", capturedAt, consent: true });
  const raw = JSON.parse(storage.getItem(EMAIL_STORAGE_KEY)!);
  assert.deepEqual(raw, { email: "a@b.ca", capturedAt, consent: true });
});

test("getStoredEmail : lit et normalise l'email stocké", () => {
  const storage = makeStorage({
    [EMAIL_STORAGE_KEY]: JSON.stringify({ email: "  Pat@X.ca ", capturedAt: 123, consent: false }),
  });
  const stored = getStoredEmail(storage as unknown as Storage);
  assert.deepEqual(stored, { email: "pat@x.ca", capturedAt: 123, consent: false });
});

test("getStoredEmail : données corrompues → null (jamais de crash)", () => {
  const storage = makeStorage({ [EMAIL_STORAGE_KEY]: "{pas du json" });
  assert.equal(getStoredEmail(storage as unknown as Storage), null);
  const empty = makeStorage();
  assert.equal(getStoredEmail(empty as unknown as Storage), null);
});

// ── Payload webhook ───────────────────────────────────────────────

test("buildLeadPayload : structure exacte du POST Make", () => {
  const capturedAt = 1_700_000_000_000;
  const payload = buildLeadPayload("  A@B.ca ", true, 3, capturedAt);
  assert.deepEqual(payload, {
    email: "a@b.ca",
    consent: true,
    source: "Marges IQ",
    simulations: 3,
    capturedAt,
  });
});

test("sendLeadToWebhook : URL non configurée → skip silencieux (pas d'envoi)", async () => {
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    calls.push("fetch");
    throw new Error("ne devrait jamais être appelé");
  };
  try {
    const ok = await sendLeadToWebhook(buildLeadPayload("a@b.ca", false, 0));
    assert.equal(ok, false);
    assert.deepEqual(calls, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
