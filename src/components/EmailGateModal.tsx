/**
 * EmailGateModal — Marges IQ
 *
 * Deux modes :
 *  - "gate"  : modal BLOQUANTE (1re fois). Titre « Accès gratuit — entrez votre
 *              email une seule fois ». Case consentement Loi 25 non pré-cochée.
 *              Aucune fermeture possible : l'email est requis pour démarrer.
 *  - "reask" : modal DOUCE (45 jours). Champ pré-rempli, [Continuer] / [Plus tard].
 *              Zéro blocage.
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { isValidEmail } from "../lib/leadCapture";

interface EmailGateModalProps {
  mode: "gate" | "reask";
  /** Email pré-rempli (mode reask uniquement). */
  initialEmail?: string;
  /** Déclenché quand l'utilisateur confirme (gate: après validation, reask: [Continuer]). */
  onConfirm: (email: string, consent: boolean) => void;
  /** [Plus tard] — reask uniquement. */
  onDismiss?: () => void;
}

export default function EmailGateModal({ mode, initialEmail = "", onConfirm, onDismiss }: EmailGateModalProps) {
  const [email, setEmail] = useState<string>(initialEmail);
  const [consent, setConsent] = useState<boolean>(false);
  const [touched, setTouched] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const valid = isValidEmail(email);
  const showError = touched && !valid;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setTouched(true);
      return;
    }
    onConfirm(email.trim(), mode === "gate" ? consent : true);
  };

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
            {mode === "gate" ? "Accès gratuit — entrez votre email une seule fois" : "Votre email est toujours bon ?"}
          </h2>
          {mode === "gate" ? (
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Pour éviter les comptes anonymes, on valide une seule adresse. Aucun mot de passe, aucun paiement.
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              On met juste votre adresse à jour — vos simulations restent intactes.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="email-gate-input" className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Adresse courriel
          </label>
          <input
            ref={inputRef}
            id="email-gate-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="vous@entreprise.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setTouched(true);
            }}
            className={`w-full bg-[#0d121f] border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-colors focus:ring-2 ${
              showError
                ? "border-red-500/70 focus:ring-red-500/30"
                : "border-slate-700/70 focus:border-orange-500/70 focus:ring-orange-500/20"
            }`}
            aria-invalid={showError}
            aria-describedby={showError ? "email-gate-error" : undefined}
          />
          {showError && (
            <p id="email-gate-error" className="text-[11px] text-red-400 mt-1.5">
              Adresse courriel invalide ou temporaire (jetable) — vérifiez le format.
            </p>
          )}

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
              disabled={!valid}
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
