/**
 * EmailGateModal — Marges IQ
 *
 * Deux modes :
 *  - "gate"  : modal BLOQUANTE (1re fois). Titre « Accès gratuit — entrez vos
 *              informations une seule fois ». Champs obligatoires : prénom,
 *              nom, entreprise, email (validation au blur). Case consentement
 *              Loi 25 non pré-cochée. Aucune fermeture possible : les
 *              informations sont requises pour démarrer.
 *  - "reask" : modal DOUCE (45 jours). Champs pré-remplis depuis le contact
 *              stocké, [Continuer] / [Plus tard]. Zéro blocage.
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { isValidEmail, isValidName, type GateContactData } from "../lib/leadCapture";

interface EmailGateModalProps {
  mode: "gate" | "reask";
  /** Contact pré-rempli (mode reask uniquement — email + prénom/nom/entreprise stockés). */
  initialContact?: Partial<GateContactData>;
  /** Déclenché quand l'utilisateur confirme (gate: après validation, reask: [Continuer]). */
  onConfirm: (contact: GateContactData, consent: boolean) => void;
  /** [Plus tard] — reask uniquement. */
  onDismiss?: () => void;
}

type TouchedFields = Partial<Record<keyof GateContactData, boolean>>;

export default function EmailGateModal({ mode, initialContact = {}, onConfirm, onDismiss }: EmailGateModalProps) {
  const [firstName, setFirstName] = useState<string>(initialContact.firstName ?? "");
  const [lastName, setLastName] = useState<string>(initialContact.lastName ?? "");
  const [company, setCompany] = useState<string>(initialContact.company ?? "");
  const [email, setEmail] = useState<string>(initialContact.email ?? "");
  const [consent, setConsent] = useState<boolean>(false);
  const [touched, setTouched] = useState<TouchedFields>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const validFirstName = isValidName(firstName);
  const validLastName = isValidName(lastName);
  const validCompany = isValidName(company);
  const validEmail = isValidEmail(email);
  const allValid = validFirstName && validLastName && validCompany && validEmail;

  const markTouched = (field: keyof GateContactData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) {
      setTouched({ firstName: true, lastName: true, company: true, email: true });
      return;
    }
    onConfirm(
      { firstName: firstName.trim(), lastName: lastName.trim(), company: company.trim(), email: email.trim() },
      mode === "gate" ? consent : true
    );
  };

  const inputClass = (invalid: boolean) =>
    `w-full bg-[#0d121f] border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-colors focus:ring-2 ${
      invalid ? "border-red-500/70 focus:ring-red-500/30" : "border-slate-700/70 focus:border-orange-500/70 focus:ring-orange-500/20"
    }`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-gate-title"
      data-email-gate={mode}
    >
      <div className="w-full max-w-md bg-[#111727] border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-600/15 text-orange-500 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h2 id="email-gate-title" className="text-xl font-black tracking-tight text-white">
            {mode === "gate" ? "Accès gratuit — entrez vos informations une seule fois" : "Vos informations sont toujours bonnes ?"}
          </h2>
          {mode === "gate" ? (
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Pour éviter les comptes anonymes, on valide une seule fois vos coordonnées. Aucun mot de passe, aucun paiement.
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              On met juste vos informations à jour — vos simulations restent intactes.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="gate-first-name" className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Prénom
              </label>
              <input
                ref={inputRef}
                id="gate-first-name"
                type="text"
                autoComplete="given-name"
                placeholder="Patricia"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={() => markTouched("firstName")}
                className={inputClass(touched.firstName && !validFirstName)}
                aria-invalid={touched.firstName && !validFirstName}
                aria-describedby={touched.firstName && !validFirstName ? "gate-first-name-error" : undefined}
              />
              {touched.firstName && !validFirstName && (
                <p id="gate-first-name-error" className="text-[11px] text-red-400 mt-1.5">
                  Minimum 2 caractères.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="gate-last-name" className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Nom
              </label>
              <input
                id="gate-last-name"
                type="text"
                autoComplete="family-name"
                placeholder="Tremblay"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={() => markTouched("lastName")}
                className={inputClass(touched.lastName && !validLastName)}
                aria-invalid={touched.lastName && !validLastName}
                aria-describedby={touched.lastName && !validLastName ? "gate-last-name-error" : undefined}
              />
              {touched.lastName && !validLastName && (
                <p id="gate-last-name-error" className="text-[11px] text-red-400 mt-1.5">
                  Minimum 2 caractères.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="gate-company" className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Nom de l'entreprise
            </label>
            <input
              id="gate-company"
              type="text"
              autoComplete="organization"
              placeholder="Rénovations Tremblay inc."
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onBlur={() => markTouched("company")}
              className={inputClass(touched.company && !validCompany)}
              aria-invalid={touched.company && !validCompany}
              aria-describedby={touched.company && !validCompany ? "gate-company-error" : undefined}
            />
            {touched.company && !validCompany && (
              <p id="gate-company-error" className="text-[11px] text-red-400 mt-1.5">
                Minimum 2 caractères.
              </p>
            )}
          </div>

          <div className="mt-4">
            <label htmlFor="email-gate-input" className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Adresse courriel
            </label>
            <input
              id="email-gate-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="vous@entreprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => markTouched("email")}
              className={inputClass(touched.email && !validEmail)}
              aria-invalid={touched.email && !validEmail}
              aria-describedby={touched.email && !validEmail ? "email-gate-error" : undefined}
            />
            {touched.email && !validEmail && (
              <p id="email-gate-error" className="text-[11px] text-red-400 mt-1.5">
                Adresse courriel invalide ou temporaire (jetable) — vérifiez le format.
              </p>
            )}
          </div>

          {mode === "gate" && (
            <div className="mt-4">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-[#0d121f] accent-orange-600 cursor-pointer"
                />
                <span className="text-xs text-slate-300 leading-snug">
                  Rester en contact avec HUVI Optimisation
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Vos données servent uniquement à vous recontacter. Vous pouvez vous retirer en tout temps.
                  </span>
                </span>
              </label>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {mode === "reask" && onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="flex-1 px-4 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                Plus tard
              </button>
            )}
            <button
              type="submit"
              disabled={!allValid}
              className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl transition-all shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            >
              {mode === "gate" ? "Commencer mon analyse" : "Continuer"}
            </button>
          </div>
        </form>

        {mode === "gate" && (
          <p className="text-[10px] text-slate-500 mt-4 text-center leading-relaxed">
            Conforme à la Loi 25 (Québec). Aucun partage à des tiers.
          </p>
        )}
      </div>
    </div>
  );
}
