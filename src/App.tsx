/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ModeType, SimulationState } from "./types";
import HomeDashboard from "./components/HomeDashboard";
import ProjectForm from "./components/ProjectForm";
import ResultScreen from "./components/ResultScreen";
import PrintPDF from "./components/PrintPDF";
import HuviLogo from "./components/HuviLogo";
import EmailGateModal from "./components/EmailGateModal";
import {
  getStoredContact,
  saveContact,
  shouldShowGate,
  shouldShowReask,
  buildLeadPayload,
  sendLeadToWebhook,
  StoredContact,
  GateContactData,
} from "./lib/leadCapture";

// ===== Persistance locale (localStorage, préfixe marges-iq:) =====
const STORAGE_KEY = "marges-iq:simulations";
const DRAFT_KEY = "marges-iq:draft";
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function createInitialSimulation(mode: ModeType): SimulationState {
  const defaultTrade = "Nettoyage";
  return {
    id: "sim-" + Math.random().toString(36).substring(2, 9),
    projectName: "",
    mode,
    createdAt: new Date().toISOString(),
    measurement: {
      tradeType: defaultTrade,
      operationalProfile: "Service simple",
      objective: "Maximiser le profit",
      complexity: "Standard",
      unit: "pi²",
      quantity: 100,
      quantityMode: "simple",
      lines: [],
    },
    directCosts: {
      labor: { employees: 1, days: 1, hoursPerDay: 8, hourlyRate: 30 },
      materialsEstimation: 150,
      materialsDetailed: [],
      subcontractors: [],
      equipments: 0,
    },
    transactionalCosts: {
      travelLevel: "Moyen",
      travelDistanceKm: 25,
      travelRatePerKm: 0.6,
      travelFrequency: 1,
      permisDetailed: 0,
      conformityAccess: 0,
    },
    businessCosts: {
      cacLevel: "Moyen",
      cacRealMarketing: 100,
      cacConversionRate: 10,
      overheadMonthly: 150,
      overheadLaborAllocationPercent: 15,
    },
    resilience: { bufferPercent: 10 },
    margin: { type: "percent", targetValue: 20 },
    strategicScore: {
      clientValue: 0,
      portfolioEffect: 0,
      acquisitionFuture: 0,
      operationalAlignment: 0,
    },
  };
}

function loadSimulations(): SimulationState[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SimulationState[]) : [];
  } catch {
    return [];
  }
}

function loadDraft(): SimulationState | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.state || !parsed.savedAt) return null;
    if (Date.now() - Number(parsed.savedAt) > DRAFT_MAX_AGE_MS) return null;
    return parsed.state as SimulationState;
  } catch {
    return null;
  }
}

function getInitialMode(): ModeType | null {
  try {
    const m = new URLSearchParams(window.location.search).get("mode");
    return m === "quick" || m === "standard" || m === "pro" ? m : null;
  } catch {
    return null;
  }
}

function isEmbedMode(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("embed") === "1";
  } catch {
    return false;
  }
}

// ===== Lead capture (gate email) =====
interface GateState {
  mode: "gate" | "reask";
  /** Mode à démarrer après validation du gate (null = simple ouverture). */
  pendingMode: ModeType | null;
}

/**
 * Détermine la modale à afficher à l'ouverture :
 *  - avec ?mode= (démarrage direct, pas de clic) : gate bloquant si aucun email
 *  - sans mode : AUCUN gate bloquant à l'ouverture (le brief le déclenche au clic
 *    sur Quick/Standard/Pro) ; seul le reask doux 45 j peut s'afficher
 */
function computeInitialGate(): GateState | null {
  const stored = getStoredContact();
  const mode = getInitialMode();
  if (mode) {
    if (shouldShowGate(stored)) {
      return { mode: "gate", pendingMode: mode };
    }
    return shouldShowReask(stored) ? { mode: "reask", pendingMode: mode } : null;
  }
  return shouldShowReask(stored) ? { mode: "reask", pendingMode: null } : null;
}

export default function App() {
  const [isEmbed] = useState<boolean>(isEmbedMode);
  const [gateState, setGateState] = useState<GateState | null>(computeInitialGate);
  const [pastSimulations, setPastSimulations] = useState<SimulationState[]>(loadSimulations);
  const [viewState, setViewState] = useState<"dashboard" | "form" | "result">(() => {
    if (getInitialMode()) return "form";
    // En embed, ne jamais restaurer le brouillon : l'embed doit être neutre.
    if (!isEmbedMode() && loadDraft()) return "form";
    return "dashboard";
  });
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);
  const [editingState, setEditingState] = useState<SimulationState | null>(() => {
    const mode = getInitialMode();
    if (mode) return createInitialSimulation(mode);
    return isEmbedMode() ? null : loadDraft();
  });

  // Persistance réelle en localStorage (préfixe marges-iq:)
  const saveToLocalStorage = (simulations: SimulationState[]) => {
    setPastSimulations(simulations);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(simulations));
    } catch (err) {
      console.error("Échec de sauvegarde locale:", err);
    }
  };

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  };

  const handleDraftChange = (draft: SimulationState) => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ state: draft, savedAt: Date.now() }));
    } catch {
      /* ignore */
    }
  };

  const startSimulation = (mode: ModeType) => {
    setEditingState(createInitialSimulation(mode));
    setViewState("form");
  };

  const handleNewSimulation = (mode: ModeType) => {
    // Gate bloquant (1re fois) : le mode sélectionné démarre APRÈS validation.
    const stored = getStoredContact();
    if (shouldShowGate(stored)) {
      setGateState({ mode: "gate", pendingMode: mode });
      return;
    }
    startSimulation(mode);
  };

  /** Validation du gate bloquant (1re fois) : persiste + envoie le lead + démarre le mode. */
  const handleGateConfirm = (contact: GateContactData, consent: boolean) => {
    const stored = saveContact(contact.firstName, contact.lastName, contact.company, contact.email, consent);
    void sendLeadToWebhook(
      buildLeadPayload(contact.firstName, contact.lastName, contact.company, contact.email, consent, pastSimulations.length, stored.capturedAt)
    );
    if (gateState?.pendingMode) {
      startSimulation(gateState.pendingMode);
    }
    setGateState(null);
  };

  /** [Continuer] du reask 45 jours : met à jour le contact + capturedAt + renvoie le lead. */
  const handleReaskConfirm = (contact: GateContactData) => {
    const prev = getStoredContact();
    const stored = saveContact(
      contact.firstName,
      contact.lastName,
      contact.company,
      contact.email,
      prev?.consent ?? false,
      Date.now()
    );
    void sendLeadToWebhook(
      buildLeadPayload(contact.firstName, contact.lastName, contact.company, contact.email, stored.consent, pastSimulations.length, stored.capturedAt)
    );
    setGateState(null);
  };

  /** [Plus tard] du reask : ferme, re-tenté à la prochaine ouverture. */
  const handleReaskDismiss = () => {
    setGateState(null);
  };

  const handleSelectSimulation = (id: string) => {
    setSelectedSimId(id);
    setViewState("result");
  };

  const handleDeleteSimulation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = pastSimulations.filter((sim) => sim.id !== id);
    saveToLocalStorage(filtered);
  };

  const handleSaveForm = (stateToSave: SimulationState) => {
    let updatedList = [...pastSimulations];
    const index = updatedList.findIndex((sim) => sim.id === stateToSave.id);

    // If blank name, auto set literal title based on trade unit quantity
    if (!stateToSave.projectName.trim()) {
      stateToSave.projectName = `Simulation ${stateToSave.measurement.tradeType} - ${stateToSave.measurement.quantity} ${stateToSave.measurement.unit}`;
    }

    if (index > -1) {
      updatedList[index] = stateToSave;
    } else {
      updatedList.unshift(stateToSave);
    }

    saveToLocalStorage(updatedList);
    clearDraft();
    setSelectedSimId(stateToSave.id);
    setViewState("result");
  };

  const handleSaveResultUpdates = (updatedState: SimulationState) => {
    const updated = pastSimulations.map((sim) => (sim.id === updatedState.id ? updatedState : sim));
    saveToLocalStorage(updated);
  };

  const handleEditFromResults = () => {
    const activeSim = pastSimulations.find((sim) => sim.id === selectedSimId);
    if (activeSim) {
      setEditingState(activeSim);
      setViewState("form");
    }
  };

  const handleCancelForm = () => {
    clearDraft();
    setEditingState(null);
    setViewState("dashboard");
  };

  const currentActiveSim = selectedSimId
    ? pastSimulations.find((sim) => sim.id === selectedSimId)
    : editingState;

  return (
    <div className="min-h-screen bg-[#0d121f] text-slate-100 flex flex-col font-sans">
      {/* Visual Navigation Header */}
      {!isEmbed && (
      <header className="border-b border-slate-800/80 bg-[#111727]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 print:hidden">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div
            onClick={() => setViewState("dashboard")}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform shadow-md">
              M
            </div>
            <span className="text-lg font-black tracking-wider text-white">
              Marges <span className="text-orange-500">IQ</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-500 font-mono hidden sm:flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              STABLE v1.0.0
            </div>
            <div className="border-l border-slate-800/80 pl-4 h-9 flex items-center md:scale-100 scale-90 origin-right">
              <a
                href="https://www.huvioptimisation.com/"
                target="_blank"
                rel="noopener noreferrer"
                title="HUVI Optimisation — site principal"
                aria-label="HUVI Optimisation — site principal (nouvel onglet)"
                className="block hover:opacity-80 transition-opacity"
              >
                <HuviLogo size="md" />
              </a>
            </div>
          </div>
        </div>
      </header>
      )}

      {/* Main Container Stage */}
      <main className="flex-1 pb-16 print:hidden">
        {viewState === "dashboard" && (
          <HomeDashboard
            pastSimulations={pastSimulations}
            onSelectSimulation={handleSelectSimulation}
            onNewSimulation={handleNewSimulation}
            onDeleteSimulation={handleDeleteSimulation}
          />
        )}

        {viewState === "form" && editingState && (
          <ProjectForm
            initialState={editingState}
            onSave={handleSaveForm}
            onCancel={handleCancelForm}
            onDraftChange={handleDraftChange}
          />
        )}

        {viewState === "result" && currentActiveSim && (
          <ResultScreen
            simulation={currentActiveSim}
            onBack={() => setViewState("dashboard")}
            onEdit={handleEditFromResults}
            onSaveSimulationToHistory={handleSaveResultUpdates}
          />
        )}
      </main>

      {!isEmbed && (
        <footer className="border-t border-slate-800/80 bg-[#111727]/90 px-6 py-6 print:hidden">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <a
              href="https://www.huvioptimisation.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors font-semibold"
            >
              Propulsé par HUVI Optimisation
            </a>
            <a
              href="https://www.huvioptimisation.com/ressources/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              Guides & ressources
            </a>
          </div>
        </footer>
      )}

      {/* Lead capture — gate bloquant (1re fois) ou reask doux (45 j) */}
      {gateState && (
        <EmailGateModal
          mode={gateState.mode}
          initialContact={getStoredContact() ?? undefined}
          onConfirm={
            gateState.mode === "gate"
              ? (contact, consent) => handleGateConfirm(contact, consent)
              : (contact) => handleReaskConfirm(contact)
          }
          onDismiss={gateState.mode === "reask" ? handleReaskDismiss : undefined}
        />
      )}

      {/* Client Proposal PDF printing layout overlay */}
      {currentActiveSim && <PrintPDF simulation={currentActiveSim} />}
    </div>
  );
}
