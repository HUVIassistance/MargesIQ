/**
 * Tests headless — lead capture (gate enrichi + reask 45 j)
 *
 * Exécution : npm test  (tsx --test tests/*.test.ts)
 * Logique pure testée sans DOM ; localStorage et Date mockés par injection.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CONTACT_STORAGE_KEY,
  EMAIL_STORAGE_KEY,
  REASK_AFTER_MS,
  LEAD_WEBHOOK_URL,
  isValidEmail,
  isValidName,
  normalizeEmail,
  shouldShowGate,
  shouldShowReask,
  getStoredContact,
  saveContact,
  buildLeadPayload,
  sendLeadToWebhook,
  StoredContact,
} from "../src/lib/leadCapture";

/** Mock localStorage minimal conforme à Pick<Storage, ...>. */
function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    _map: map,
  };
}

function makeContact(overrides: Partial<StoredContact> = {}): StoredContact {
  return {
    firstName: "Patricia",
    lastName: "Tremblay",
    company: "Rénovations Tremblay inc.",
    email: "patricia@entreprise.ca",
    capturedAt: Date.now(),
    consent: false,
    ...overrides,
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

// ── Validation prénom / nom / entreprise ──────────────────────────

test("isValidName : 2 caractères minimum après trim", () => {
  assert.equal(isValidName("Patricia"), true);
  assert.equal(isValidName("  Léa "), true); // trim
  assert.equal(isValidName("A"), false);
  assert.equal(isValidName("  "), false);
  assert.equal(isValidName(""), false);
});

// ── Gate (1re fois, bloquant) ─────────────────────────────────────

test("gate au 1er clic mode : aucun contact stocké → gate requis", () => {
  assert.equal(shouldShowGate(null), true);
});

test("gate absent si contact présent et valide", () => {
  assert.equal(shouldShowGate(makeContact()), false);
});

test("gate requis si email stocké invalide (corrompu)", () => {
  const stored: StoredContact = makeContact({ email: "pas-un-email" });
  assert.equal(shouldShowGate(stored), true);
});

// ── Reask doux 45 jours ───────────────────────────────────────────

test("reask après 45 jours (mock date) : déclenché", () => {
  const now = 1_800_000_000_000;
  const stored = makeContact({ capturedAt: now - 46 * DAY_MS, consent: true });
  assert.equal(shouldShowReask(stored, now), true);
});

test("reask AVANT 45 jours : pas déclenché", () => {
  const now = 1_800_000_000_000;
  const stored = makeContact({ capturedAt: now - 44 * DAY_MS, consent: true });
  assert.equal(shouldShowReask(stored, now), false);
});

test("reask à exactement 45 jours : déclenché (>= seuil)", () => {
  const now = 1_800_000_000_000;
  const stored = makeContact({ capturedAt: now - REASK_AFTER_MS, consent: true });
  assert.equal(shouldShowReask(stored, now), true);
});

test("reask sans contact stocké : jamais déclenché", () => {
  assert.equal(shouldShowReask(null, Date.now()), false);
});

// ── Modal doux fermable ([Plus tard] = aucun changement) ──────────

test("dismiss du reask ne modifie pas le stockage → re-tenté à la prochaine ouverture", () => {
  const storage = makeStorage({
    [CONTACT_STORAGE_KEY]: JSON.stringify(makeContact({ capturedAt: 1_000_000_000, consent: true })),
  });
  const stored = getStoredContact(storage as unknown as Storage);
  // [Plus tard] ne fait AUCUN save : on vérifie que la donnée reste inchangée...
  const before = storage.getItem(CONTACT_STORAGE_KEY);
  // ...et que le reask est toujours dû à la prochaine ouverture.
  assert.equal(shouldShowReask(stored, Date.now()), true);
  assert.equal(storage.getItem(CONTACT_STORAGE_KEY), before);
});

// ── Persistance localStorage ──────────────────────────────────────

test("saveContact : persiste le contact complet sous marges-iq:contact", () => {
  const storage = makeStorage();
  const capturedAt = 1_700_000_000_000;
  const saved = saveContact("  Patricia ", " Tremblay ", " Rénovations Tremblay inc. ", "  A@B.ca ", true, capturedAt, storage as unknown as Storage);
  assert.deepEqual(saved, {
    firstName: "Patricia",
    lastName: "Tremblay",
    company: "Rénovations Tremblay inc.",
    email: "a@b.ca",
    capturedAt,
    consent: true,
  });
  const raw = JSON.parse(storage.getItem(CONTACT_STORAGE_KEY)!);
  assert.deepEqual(raw, {
    firstName: "Patricia",
    lastName: "Tremblay",
    company: "Rénovations Tremblay inc.",
    email: "a@b.ca",
    capturedAt,
    consent: true,
  });
});

test("getStoredContact : lit et normalise le contact stocké", () => {
  const storage = makeStorage({
    [CONTACT_STORAGE_KEY]: JSON.stringify({
      firstName: "  Pat ",
      lastName: " Tremblay ",
      company: "  Rénovations inc. ",
      email: "  Pat@X.ca ",
      capturedAt: 123,
      consent: false,
    }),
  });
  const stored = getStoredContact(storage as unknown as Storage);
  assert.deepEqual(stored, {
    firstName: "Pat",
    lastName: "Tremblay",
    company: "Rénovations inc.",
    email: "pat@x.ca",
    capturedAt: 123,
    consent: false,
  });
});

test("getStoredContact : données corrompues → null (jamais de crash)", () => {
  const storage = makeStorage({ [CONTACT_STORAGE_KEY]: "{pas du json" });
  assert.equal(getStoredContact(storage as unknown as Storage), null);
  const empty = makeStorage();
  assert.equal(getStoredContact(empty as unknown as Storage), null);
});

test("getStoredContact : migration depuis l'ancienne clé marges-iq:email (compat ascendant)", () => {
  const storage = makeStorage({
    [EMAIL_STORAGE_KEY]: JSON.stringify({ email: "  Patricia@Entreprise.CA ", capturedAt: 1_234_567_890, consent: true }),
  });
  const migrated = getStoredContact(storage as unknown as Storage);
  assert.deepEqual(migrated, {
    firstName: "",
    lastName: "",
    company: "",
    email: "patricia@entreprise.ca",
    capturedAt: 1_234_567_890,
    consent: true,
  });
  // La nouvelle clé est écrite pour la prochaine lecture ; l'ancienne est conservée (réversibilité).
  assert.ok(storage.getItem(CONTACT_STORAGE_KEY), "la nouvelle clé doit être écrite après migration");
  assert.ok(storage.getItem(EMAIL_STORAGE_KEY), "l'ancienne clé doit être conservée");
});

test("getStoredContact : la nouvelle clé prime sur l'ancienne (pas de régression après enrichissement)", () => {
  const storage = makeStorage({
    [CONTACT_STORAGE_KEY]: JSON.stringify(makeContact()),
    [EMAIL_STORAGE_KEY]: JSON.stringify({ email: "vieux@email.ca", capturedAt: 1, consent: false }),
  });
  const stored = getStoredContact(storage as unknown as Storage);
  assert.equal(stored?.email, VALID);
  assert.equal(stored?.firstName, "Patricia");
});

// ── Payload webhook ───────────────────────────────────────────────

test("buildLeadPayload : structure exacte du POST Make (payload complet)", () => {
  const capturedAt = 1_700_000_000_000;
  const payload = buildLeadPayload("  Patricia ", " Tremblay ", " Rénovations Tremblay inc. ", "  A@B.ca ", true, 3, capturedAt);
  assert.deepEqual(payload, {
    firstName: "Patricia",
    lastName: "Tremblay",
    company: "Rénovations Tremblay inc.",
    email: "a@b.ca",
    consent: true,
    source: "Marges IQ",
    simulations: 3,
    capturedAt,
  });
});

test("sendLeadToWebhook : URL configurée → POST du payload au webhook Make", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    const payload = buildLeadPayload("Patricia", "Tremblay", "Rénovations inc.", "a@b.ca", true, 3);
    const ok = await sendLeadToWebhook(payload);
    assert.equal(ok, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, LEAD_WEBHOOK_URL);
    assert.equal(calls[0].init?.method, "POST");
    assert.equal(calls[0].init?.headers?.["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), payload);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
