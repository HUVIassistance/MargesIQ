/**
 * Lead capture — Marges IQ
 *
 * Gate (Loi 25 compliant) : prénom, nom, entreprise et email obligatoires une
 * seule fois, puis re-demande douce après 45 jours. Envoi du lead vers un
 * webhook Make configurable (jamais de clé API Airtable dans le front).
 *
 * Persistance : `marges-iq:contact` (objet complet). Compat ascendant :
 * l'ancienne clé `marges-iq:email` est migrée automatiquement à la lecture.
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ===== Configuration =====
// URL du webhook Make (scénario : Webhook → Airtable 🕵️Leads — Prénom / Nom /
// Entreprise / Courriel / Source / consentement). Laisser VIDE tant que le
// webhook n'existe pas : l'envoi est silencieusement sauté (log console.warn)
// et la capture locale fonctionne quand même.
export const LEAD_WEBHOOK_URL = "https://hook.us1.make.com/wpmio4qzoilxrjuenuyhwfv4d8dbepby";

// ===== Constantes de persistance =====
export const CONTACT_STORAGE_KEY = "marges-iq:contact";
/** Ancienne clé (avant gate enrichi) — lue uniquement pour migrer. */
export const EMAIL_STORAGE_KEY = "marges-iq:email";
export const REASK_AFTER_MS = 45 * 24 * 60 * 60 * 1000; // 45 jours

// ===== Blocklist de domaines jetables (données publiques, liste statique) =====
export const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "sharklasers.com",
  "grr.la",
  "tempmail.com",
  "tempmailo.com",
  "temp-mail.org",
  "temp-mail.io",
  "10minutemail.com",
  "10minutemail.net",
  "10minutemail.org",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "trashmail.com",
  "trashmail.de",
  "trashmail.me",
  "throwawaymail.com",
  "maildrop.cc",
  "mailnesia.com",
  "mailcatch.com",
  "getnada.com",
  "dispostable.com",
  "spam4.me",
  "mozartmail.com",
  "mintemail.com",
  "mytemp.email",
  "fakemailgenerator.com",
  "emailondeck.com",
  "burnermail.io",
  "inboxbear.com",
  "spambox.us",
]);

/** Contact complet capturé par le gate. */
export interface StoredContact {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  capturedAt: number; // epoch ms
  consent: boolean;
}

/** Payload envoyé au webhook Make (mapping Airtable 🕵️Leads). */
export interface LeadPayload {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  consent: boolean;
  source: string;
  simulations: number;
  capturedAt: number; // epoch ms
}

/** Données de contact saisies dans le modal (sans consentement ni timestamp). */
export interface GateContactData {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Validation format + blocklist domaines jetables. */
export function isValidEmail(email: string): boolean {
  const value = (email || "").trim().toLowerCase();
  if (!value || value.length > 254 || !EMAIL_RE.test(value)) return false;
  const domain = value.split("@").pop() || "";
  // Domaines avec sous-domaines : vérifier aussi le domaine racine (ex. mail.mailinator.com)
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join(".");
    if (DISPOSABLE_DOMAINS.has(candidate)) return false;
  }
  return true;
}

/** Normalise un email (trim + minuscules). */
export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

/** Validation d'un nom/prénom/entreprise : au moins 2 caractères (trim). */
export function isValidName(name: string): boolean {
  return (name || "").trim().length >= 2;
}

/**
 * Faut-il montrer le gate bloquant ? Vrai si aucun contact valide n'est stocké
 * (email valide requis — prénom/nom/entreprise sont enrichis via le reask).
 */
export function shouldShowGate(stored: StoredContact | null): boolean {
  return !stored || !isValidEmail(stored.email);
}

/**
 * Faut-il montrer la re-demande douce (45 jours) ? Vrai si le contact est
 * stocké et que capturedAt est plus vieux que REASK_AFTER_MS. nowMs
 * injectable (tests).
 */
export function shouldShowReask(stored: StoredContact | null, nowMs: number = Date.now()): boolean {
  if (!stored || !isValidEmail(stored.email)) return false;
  return nowMs - stored.capturedAt >= REASK_AFTER_MS;
}

/** Parse un objet StoredContact stocké. Retourne null si absent/corrompu. */
function parseStoredContact(raw: string): StoredContact | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredContact>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.firstName !== "string" ||
      typeof parsed.lastName !== "string" ||
      typeof parsed.company !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.capturedAt !== "number"
    ) {
      return null;
    }
    return {
      firstName: parsed.firstName.trim(),
      lastName: parsed.lastName.trim(),
      company: parsed.company.trim(),
      email: normalizeEmail(parsed.email),
      capturedAt: parsed.capturedAt,
      consent: Boolean(parsed.consent),
    };
  } catch {
    return null;
  }
}

/**
 * Lit le contact stocké en localStorage (clé `marges-iq:contact`).
 * Compat ascendant : si la nouvelle clé est absente mais que l'ancienne
 * (`marges-iq:email`) existe, elle est migrée (écrite sous la nouvelle clé,
 * l'ancienne est conservée pour réversibilité) et retournée avec prénom /
 * nom / entreprise vides. Retourne null si absent/corrompu.
 */
export function getStoredContact(storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage): StoredContact | null {
  const raw = storage.getItem(CONTACT_STORAGE_KEY);
  if (raw) return parseStoredContact(raw);

  // Migration depuis l'ancienne clé marges-iq:email (gate email seul)
  try {
    const legacyRaw = storage.getItem(EMAIL_STORAGE_KEY);
    if (!legacyRaw) return null;
    const legacy = JSON.parse(legacyRaw) as Partial<StoredContact>;
    if (
      !legacy ||
      typeof legacy !== "object" ||
      typeof legacy.email !== "string" ||
      typeof legacy.capturedAt !== "number"
    ) {
      return null;
    }
    const migrated: StoredContact = {
      firstName: typeof legacy.firstName === "string" ? legacy.firstName.trim() : "",
      lastName: typeof legacy.lastName === "string" ? legacy.lastName.trim() : "",
      company: typeof legacy.company === "string" ? legacy.company.trim() : "",
      email: normalizeEmail(legacy.email),
      capturedAt: legacy.capturedAt,
      consent: Boolean(legacy.consent),
    };
    storage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return null;
  }
}

/**
 * Persiste le contact (et met à jour capturedAt) sous `marges-iq:contact`.
 * Retourne l'objet stocké.
 */
export function saveContact(
  firstName: string,
  lastName: string,
  company: string,
  email: string,
  consent: boolean,
  capturedAt: number = Date.now(),
  storage: Pick<Storage, "setItem"> = window.localStorage
): StoredContact {
  const stored: StoredContact = {
    firstName: (firstName || "").trim(),
    lastName: (lastName || "").trim(),
    company: (company || "").trim(),
    email: normalizeEmail(email),
    capturedAt,
    consent,
  };
  try {
    storage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(stored));
  } catch (err) {
    console.error("Échec de sauvegarde contact:", err);
  }
  return stored;
}

/**
 * Construit le payload envoyé au webhook. simulations = nombre de simulations
 * existantes au moment de la capture (anti-mensonge : reflète l'usage réel).
 */
export function buildLeadPayload(
  firstName: string,
  lastName: string,
  company: string,
  email: string,
  consent: boolean,
  simulations: number,
  capturedAt: number = Date.now()
): LeadPayload {
  return {
    firstName: (firstName || "").trim(),
    lastName: (lastName || "").trim(),
    company: (company || "").trim(),
    email: normalizeEmail(email),
    consent,
    source: "Marges IQ",
    simulations,
    capturedAt,
  };
}

/**
 * Envoie le lead au webhook Make. Fire-and-forget : ne bloque jamais le flux
 * utilisateur. Si LEAD_WEBHOOK_URL est vide, l'envoi est sauté (log console.warn).
 */
export async function sendLeadToWebhook(payload: LeadPayload): Promise<boolean> {
  if (!LEAD_WEBHOOK_URL) {
    console.warn("[lead-capture] LEAD_WEBHOOK_URL non configuré — envoi sauté (configurer le webhook Make).");
    return false;
  }
  try {
    const res = await fetch(LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn("[lead-capture] Webhook a répondu non-OK:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[lead-capture] Envoi webhook échoué:", err);
    return false;
  }
}
