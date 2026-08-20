/**
 * Lead capture — Marges IQ
 *
 * Gate email (Loi 25 compliant) : une seule fois obligatoire, puis re-demande douce
 * après 45 jours. Envoi du lead vers un webhook Make configurable (jamais de clé
 * API Airtable dans le front).
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ===== Configuration =====
// URL du webhook Make à créer (voir CODA_LEADCAPTURE_RAPPORT.md / instructions Hugo).
// Scénario Make : Webhook → Airtable 🕵️Leads (Courriel / Source / 1er contact / consentement).
// Laisser VIDE tant que le webhook n'existe pas : l'envoi est silencieusement sauté
// (log console.warn) et la capture locale fonctionne quand même.
export const LEAD_WEBHOOK_URL = "https://hook.us1.make.com/wpmio4qzoilxrjuenuyhwfv4d8dbepby";

// ===== Constantes de persistance =====
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

export interface StoredEmail {
  email: string;
  capturedAt: number; // epoch ms
  consent: boolean;
}

export interface LeadPayload {
  email: string;
  consent: boolean;
  source: string;
  simulations: number;
  capturedAt: number; // epoch ms
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

/**
 * Faut-il montrer le gate bloquant ? Vrai si aucun email valide n'est stocké.
 */
export function shouldShowGate(stored: StoredEmail | null): boolean {
  return !stored || !isValidEmail(stored.email);
}

/**
 * Faut-il montrer la re-demande douce (45 jours) ? Vrai si l'email est stocké
 * et que capturedAt est plus vieux que REASK_AFTER_MS. nowMs injectable (tests).
 */
export function shouldShowReask(stored: StoredEmail | null, nowMs: number = Date.now()): boolean {
  if (!stored || !isValidEmail(stored.email)) return false;
  return nowMs - stored.capturedAt >= REASK_AFTER_MS;
}

/**
 * Lit l'email stocké en localStorage. Retourne null si absent/corrompu.
 */
export function getStoredEmail(storage: Pick<Storage, "getItem"> = window.localStorage): StoredEmail | null {
  try {
    const raw = storage.getItem(EMAIL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredEmail>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.email !== "string" ||
      typeof parsed.capturedAt !== "number"
    ) {
      return null;
    }
    return {
      email: normalizeEmail(parsed.email),
      capturedAt: parsed.capturedAt,
      consent: Boolean(parsed.consent),
    };
  } catch {
    return null;
  }
}

/**
 * Persiste l'email (et met à jour capturedAt). Retourne l'objet stocké.
 */
export function saveEmail(
  email: string,
  consent: boolean,
  capturedAt: number = Date.now(),
  storage: Pick<Storage, "setItem"> = window.localStorage
): StoredEmail {
  const stored: StoredEmail = { email: normalizeEmail(email), capturedAt, consent };
  try {
    storage.setItem(EMAIL_STORAGE_KEY, JSON.stringify(stored));
  } catch (err) {
    console.error("Échec de sauvegarde email:", err);
  }
  return stored;
}

/**
 * Construit le payload envoyé au webhook. simulations = nombre de simulations
 * existantes au moment de la capture (anti-mensonge : reflète l'usage réel).
 */
export function buildLeadPayload(
  email: string,
  consent: boolean,
  simulations: number,
  capturedAt: number = Date.now()
): LeadPayload {
  return {
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
