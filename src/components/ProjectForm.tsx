/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Info,
  Sparkles,
  Users,
  BarChart3,
  Briefcase,
  HelpCircle
} from "lucide-react";
import {
  SimulationState,
  TradeType,
  SubmissionObjectiveType,
  ComplexityType,
  UnitType,
  LevelType,
  MaterialCostDetail,
  SubcontractorDetail,
  OverheadLineInput,
  LaborRoleInput
} from "../types";
import { getProfileForTrade } from "../utils/pricingEngine";

interface ProjectFormProps {
  initialState: SimulationState;
  onSave: (state: SimulationState) => void;
  onCancel: () => void;
}

const ROLE_OPTIONS = [
  "Chef d'équipe",
  "Contremaître",
  "Journalier",
  "Apprenti",
  "Opérateur de machinerie",
  "Électricien",
  "Plombier",
  "Soudeur",
  "Charpentier",
  "Peintre",
  "Technicien HVAC",
  "Manœuvre",
];

const STRATEGIC_CRITERIA = [
  { key: "clientValue" as const, label: "Valeur client", desc: "Potentiel de revenus futurs et récurrence du compte" },
  { key: "portfolioEffect" as const, label: "Effet portfolio / Référence", desc: "Valeur de vitrine ou d'étude de cas pour l'entreprise" },
  { key: "acquisitionFuture" as const, label: "Acquisition future", desc: "Ouverture vers d'autres projets stratégiques ou zones géographiques" },
  { key: "operationalAlignment" as const, label: "Alignement opérationnel", desc: "Compétences d'équipe disponibles et intérêt technique" },
];

export default function ProjectForm({ initialState, onSave, onCancel }: ProjectFormProps) {
  const [state, setState] = useState<SimulationState>(initialState);
  
  // Decide how many steps dynamically based on selected mode to match requested sequence exactly
  const stepsList = React.useMemo(() => {
    if (state.mode === "quick") {
      return ["Configuration", "Coûts du projet", "Marge & Prix cible"];
    }
    if (state.mode === "standard") {
      return ["Configuration", "Coûts du projet", "Marge & Prix cible", "Score Stratégique"];
    }
    // Pro
    return ["Configuration", "Coûts du projet", "Marge & Prix cible", "Analyse Pro", "Score Stratégique"];
  }, [state.mode]);

  const maxSteps = stepsList.length;
  const [currentStep, setCurrentStep] = useState(1);

  // Computed trade profile information
  const tradeProfile = getProfileForTrade(state.measurement.tradeType);

  // Sync profile & suggestion recommendations when tradeType updates
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      measurement: {
        ...prev.measurement,
        operationalProfile: tradeProfile.profile,
      },
      resilience: {
        bufferPercent: prev.resilience.bufferPercent === 0 || prev.resilience.bufferPercent === 10
          ? tradeProfile.defaultBuffer
          : prev.resilience.bufferPercent,
      },
    }));
  }, [state.measurement.tradeType]);

  const handleNext = () => {
    if (currentStep < maxSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Validate that at least a project name is supplied, or auto-set one
      const stateToSave = { ...state };
      if (!stateToSave.projectName.trim()) {
        stateToSave.projectName = `Simulation ${stateToSave.measurement.tradeType} - ${stateToSave.measurement.quantity} ${stateToSave.measurement.unit}`;
      }
      onSave(stateToSave);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onCancel();
    }
  };

  // Lists for dropdown selectors
  const trades: TradeType[] = [
    "Nettoyage",
    "Entretien",
    "Paysagement",
    "HVAC",
    "Plomberie",
    "Électricité",
    "Rénovation",
    "Toiture",
    "Peinture",
    "Excavation",
    "Béton",
  ];

  const objectives: SubmissionObjectiveType[] = [
    "Maximiser le profit",
    "Maximiser les chances de gagner",
    "Remplir la capacité",
    "Gagner un nouveau client",
    "Projet stratégique",
  ];

  const complexities: ComplexityType[] = ["Standard", "Élevé", "Extrême"];
  const units: UnitType[] = ["pi²", "m³", "unité", "intervention", "heure machine", "projet global"];

  return (
    <div className="w-full max-w-4xl mx-auto bg-[#111727] border border-slate-800 rounded-3xl p-6 md:p-8 text-slate-100 shadow-xl mt-4 animate-fade-in" id="project_form">
      {/* Header with Visual Stepper */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 pb-5 border-b border-slate-800">
        <div>
          <span className="text-xs text-orange-400 font-mono font-bold uppercase tracking-widest bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/10">
            SIMULATION • {state.mode.toUpperCase()}
          </span>
          <h2 className="text-2xl font-extrabold text-white mt-2">
            {stepsList[currentStep - 1] === "Configuration" ? "Configurez votre projet" : stepsList[currentStep - 1]}
          </h2>
        </div>
        
        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {stepsList.map((stepName, idx) => {
            const stepNum = idx + 1;
            return (
              <div key={stepName} className="flex items-center">
                <button
                  type="button"
                  onClick={() => stepNum < currentStep && setCurrentStep(stepNum)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-300 ${
                    stepNum === currentStep
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/20 scale-105"
                      : stepNum < currentStep
                      ? "bg-slate-800 text-orange-400 cursor-pointer hover:bg-slate-700"
                      : "bg-slate-900/60 text-slate-600 cursor-not-allowed"
                  }`}
                  title={stepName}
                >
                  {stepNum}
                </button>
                {stepNum < maxSteps && (
                  <div className={`h-0.5 w-4 md:w-8 ${stepNum < currentStep ? "bg-orange-500/60" : "bg-slate-800"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-[420px]">
        {/* STEP 1: CONFIGURATION (StepConfig) */}
        {currentStep === 1 && (
          <StepConfig
            state={state}
            setState={setState}
            trades={trades}
            objectives={objectives}
            complexities={complexities}
            units={units}
          />
        )}

        {/* STEP 2: COÛTS DU PROJET (StepCosts) */}
        {currentStep === 2 && (
          <StepCosts
            state={state}
            setState={setState}
            tradeProfile={tradeProfile}
          />
        )}

        {/* STEP 3: MARGE & PRIX CIBLE (StepMargin) */}
        {currentStep === 3 && (
          <StepMargin
            state={state}
            setState={setState}
          />
        )}

        {/* STEP 4/5 based on stepsList */}
        {stepsList[currentStep - 1] === "Analyse Pro" && (
          <StepProAnalysis
            state={state}
            setState={setState}
          />
        )}

        {stepsList[currentStep - 1] === "Score Stratégique" && (
          <StepStrategic
            state={state}
            setState={setState}
          />
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-800">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors py-2 px-4 bg-slate-900 hover:bg-slate-850 rounded-xl"
        >
          <ChevronLeft size={16} /> {currentStep === 1 ? "Annuler" : "Précédent"}
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow-md shadow-orange-950/20"
          id="btn_submit_step"
        >
          {currentStep === maxSteps ? "Lancer la Simulation" : "Suivant"} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SUB-COMPONENTS & UTILITIES                                                */
/* ========================================================================= */

function Section({ title, icon, hint, children }: { title: string; icon?: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 p-5 rounded-2xl border border-slate-800/80 bg-slate-950/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-900 pb-3">
        <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {hint && (
          <p className="text-[10px] text-slate-500 flex items-center gap-1 leading-relaxed">
            <Info size={12} className="text-orange-500/60" />
            {hint}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs uppercase font-bold tracking-wider text-slate-400">{label}</label>}
      {children}
      {hint && <p className="text-[10px] text-slate-500 flex items-start gap-1 leading-normal">{hint}</p>}
    </div>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 mb-6">
      <Info className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
      <p className="text-xs text-slate-400 leading-relaxed">{text}</p>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);
}

/* ========================================================================= */
/* STEP 1: CONFIGURATION COMPONENT                                           */
/* ========================================================================= */
interface StepConfigProps {
  state: SimulationState;
  setState: React.Dispatch<React.SetStateAction<SimulationState>>;
  trades: TradeType[];
  objectives: SubmissionObjectiveType[];
  complexities: ComplexityType[];
  units: UnitType[];
}

function StepConfig({ state, setState, trades, objectives, complexities, units }: StepConfigProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Configuration du projet</h2>
        <p className="text-xs text-slate-400">Définissez le type de métier, l'objectif et les paramètres généraux du chantier.</p>
      </div>

      <Hint text="Ces paramètres activent des coefficients opérationnels, buffers de résilience suggérés et alertes spécifiques pour affiner la prise de décision." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Project Name */}
        <div className="col-span-1 md:col-span-2">
          <Field label="Nom de la simulation / Projet" hint="Donnez un nom clair pour sauvegarder et identifier ce scénario.">
            <input
              type="text"
              value={state.projectName}
              onChange={(e) => setState((prev) => ({ ...prev, projectName: e.target.value }))}
              placeholder="Ex: Pavage allée - Résidence Tremblay"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm font-bold text-white"
            />
          </Field>
        </div>

        {/* TradeType */}
        <Field label="Type de métier" hint="Sélectionnez le corps de métier principal.">
          <select
            value={state.measurement.tradeType}
            onChange={(e) => setState((prev) => ({
              ...prev,
              measurement: { ...prev.measurement, tradeType: e.target.value as TradeType }
            }))}
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm font-bold text-white"
          >
            {trades.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>

        {/* Operational Profile: Read-only computed */}
        <Field label="Profil opérationnel" hint="Détecté automatiquement selon les risques opérationnels liés au métier.">
          <div className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-sm font-extrabold text-orange-400 font-mono">
            {state.measurement.operationalProfile}
          </div>
        </Field>

        {/* Objective */}
        <Field label="Objectif stratégique de prix" hint="Influence le calcul de positionnement du prix final commandé.">
          <select
            value={state.measurement.objective}
            onChange={(e) => setState((prev) => ({
              ...prev,
              measurement: { ...prev.measurement, objective: e.target.value as SubmissionObjectiveType }
            }))}
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm text-slate-100"
          >
            {objectives.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>

        {/* Complexity */}
        <Field label="Complexité du chantier" hint="Influence le coût logistique indirect et la tolérance requise.">
          <select
            value={state.measurement.complexity}
            onChange={(e) => setState((prev) => ({
              ...prev,
              measurement: { ...prev.measurement, complexity: e.target.value as ComplexityType }
            }))}
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm font-semibold text-slate-100"
          >
            {complexities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>

        {/* Unit Type */}
        <Field label="Unité de calcul" hint="Sélectionnez l'unité d'analyse par défaut de la rentabilité.">
          <select
            value={state.measurement.unit}
            onChange={(e) => setState((prev) => ({
              ...prev,
              measurement: { ...prev.measurement, unit: e.target.value as UnitType }
            }))}
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm text-slate-100"
          >
            {units.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Field>

        {/* Quantity */}
        <Field label="Quantité totale estimée" hint="Entrez la taille du projet à réaliser.">
          <input
            type="number"
            min="1"
            value={state.measurement.quantity}
            onChange={(e) => setState((prev) => ({
              ...prev,
              measurement: { ...prev.measurement, quantity: Math.max(1, Number(e.target.value)) }
            }))}
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm font-mono font-bold text-white"
          />
        </Field>

      </div>
    </div>
  );
}

/* ========================================================================= */
/* STEP 2: COÛTS DU PROJET COMPONENT                                        */
/* ========================================================================= */
interface StepCostsProps {
  state: SimulationState;
  setState: React.Dispatch<React.SetStateAction<SimulationState>>;
  tradeProfile: { tips: string };
}

function StepCosts({ state, setState, tradeProfile }: StepCostsProps) {
  const isQuick = state.mode === "quick";
  const isPro = state.mode === "pro";

  // Detailed material line additions
  const [newMatName, setNewMatName] = useState("");
  const [newMatQty, setNewMatQty] = useState<number | "">(1);
  const [newMatUnitPrice, setNewMatUnitPrice] = useState<number | "">("");

  // Detailed subcontractor additions
  const [newSubName, setNewSubName] = useState("");
  const [newSubCost, setNewSubCost] = useState<number | "">("");

  // Handler functions
  const handleAddMaterial = () => {
    if (newMatName.trim() && Number(newMatUnitPrice) > 0) {
      const qty = Number(newMatQty) || 1;
      const price = Number(newMatUnitPrice);
      const detail: MaterialCostDetail = {
        id: Math.random().toString(),
        name: newMatName.trim(),
        cost: qty * price,
        quantity: qty,
        unitPrice: price,
      };

      setState((prev) => ({
        ...prev,
        directCosts: {
          ...prev.directCosts,
          materialsDetailed: [...prev.directCosts.materialsDetailed, detail],
        },
      }));
      setNewMatName("");
      setNewMatQty(1);
      setNewMatUnitPrice("");
    }
  };

  const handleDeleteMaterial = (id: string) => {
    setState((prev) => ({
      ...prev,
      directCosts: {
        ...prev.directCosts,
        materialsDetailed: prev.directCosts.materialsDetailed.filter((m) => m.id !== id),
      },
    }));
  };

  const handleAddSubcontractor = () => {
    if (newSubName.trim() && Number(newSubCost) > 0) {
      const detail: SubcontractorDetail = {
        id: Math.random().toString(),
        name: newSubName.trim(),
        cost: Number(newSubCost),
      };

      setState((prev) => ({
        ...prev,
        directCosts: {
          ...prev.directCosts,
          subcontractors: [...prev.directCosts.subcontractors, detail],
        },
      }));
      setNewSubName("");
      setNewSubCost("");
    }
  };

  const handleDeleteSubcontractor = (id: string) => {
    setState((prev) => ({
      ...prev,
      directCosts: {
        ...prev.directCosts,
        subcontractors: prev.directCosts.subcontractors.filter((s) => s.id !== id),
      },
    }));
  };

  // Strategic labor rules list calculator
  const handleAddLaborRole = (role: string) => {
    const list = state.directCosts.laborRoles || [];
    let hourlyRate = 35;
    if (role === "Contremaître") {
      hourlyRate = 55;
    } else if (role === "Chef d'équipe") {
      hourlyRate = 45;
    } else if (role === "Journalier") {
      hourlyRate = 30;
    } else if (role === "Apprenti" || role === "Manœuvre") {
      hourlyRate = 25;
    } else if (role === "Électricien" || role === "Plombier" || role === "Technicien HVAC") {
      hourlyRate = 50;
    } else if (role === "Opérateur de machinerie" || role === "Soudeur" || role === "Charpentier") {
      hourlyRate = 40;
    }

    setState((prev) => ({
      ...prev,
      directCosts: {
        ...prev.directCosts,
        laborRoles: [...list, { role, count: 1, days: 5, hoursPerDay: 8, hourlyRate }],
      },
    }));
  };

  const handleUpdateLaborRole = (i: number, partial: Partial<LaborRoleInput>) => {
    const list = [...(state.directCosts.laborRoles || [])];
    if (list[i]) {
      list[i] = { ...list[i], ...partial };
      setState((prev) => ({
        ...prev,
        directCosts: {
          ...prev.directCosts,
          laborRoles: list,
        },
      }));
    }
  };

  const handleRemoveLaborRole = (i: number) => {
    const list = (state.directCosts.laborRoles || []).filter((_, idx) => idx !== i);
    setState((prev) => ({
      ...prev,
      directCosts: { ...prev.directCosts, laborRoles: list },
    }));
  };

  // Detailed Overheads list updates
  const handleAddOverheadLine = () => {
    const list = state.businessCosts.overheadDetailed || [];
    setState((prev) => ({
      ...prev,
      businessCosts: {
        ...prev.businessCosts,
        overheadDetailed: [...list, { label: "", amount: 0 }],
      },
    }));
  };

  const handleUpdateOverheadLine = (i: number, partial: Partial<OverheadLineInput>) => {
    const list = [...(state.businessCosts.overheadDetailed || [])];
    if (list[i]) {
      list[i] = { ...list[i], ...partial };
      setState((prev) => ({
        ...prev,
        businessCosts: {
          ...prev.businessCosts,
          overheadDetailed: list,
        },
      }));
    }
  };

  const handleRemoveOverheadLine = (i: number) => {
    const list = (state.businessCosts.overheadDetailed || []).filter((_, idx) => idx !== i);
    setState((prev) => ({
      ...prev,
      businessCosts: { ...prev.businessCosts, overheadDetailed: list },
    }));
  };

  // Computed live numbers
  const laborTotal = isPro && state.directCosts.laborRoles && state.directCosts.laborRoles.length > 0
    ? state.directCosts.laborRoles.reduce((s, r) => s + r.count * r.days * r.hoursPerDay * r.hourlyRate, 0)
    : state.directCosts.labor.employees * state.directCosts.labor.days * state.directCosts.labor.hoursPerDay * state.directCosts.labor.hourlyRate;

  const mDetailedTotal = state.directCosts.materialsDetailed.reduce((s, m) => s + m.cost, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Coûts du projet</h2>
        <p className="text-xs text-slate-400">
          {isPro ? "Analyse granulaire des coûts de main-d'œuvre et dépenses par poste." : "Estimez les charges directes de vos chantiers."}
        </p>
      </div>

      <Hint text={isQuick
        ? "En mode Quick (Rapide), des estimations forfaitaires suffisent. Le système déploie automatiquement les compléments d'administration."
        : "Entrez chaque champ avec précision. Les lignes ou frais restants à zero sont omis des synthèses analytiques."
      } />

      {/* 1. MAIN D'ŒUVRE (Labor Section) */}
      {isPro ? (
        <Section title="Main-d'œuvre par Rôle" icon={<span>🪚</span>} hint="Détaillez les rôles de l'équipe pour un prix de revient rigoureux.">
          <div className="space-y-3">
            {(state.directCosts.laborRoles || []).map((r, i) => (
              <div key={i} className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={r.role}
                    onChange={(e) => handleUpdateLaborRole(i, { role: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-white"
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveLaborRole(i)}
                    className="p-1.5 bg-red-950/20 text-red-400 hover:text-red-300 rounded-lg border border-red-950/30 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  <Field label="Effectif">
                    <input
                      type="number"
                      min="1"
                      value={r.count}
                      onChange={(e) => handleUpdateLaborRole(i, { count: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-center text-xs text-white"
                    />
                  </Field>
                  <Field label="Jours">
                    <input
                      type="number"
                      min="1"
                      value={r.days}
                      onChange={(e) => handleUpdateLaborRole(i, { days: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-center text-xs text-white"
                    />
                  </Field>
                  <Field label="Hrs/Jour">
                    <input
                      type="number"
                      min="1"
                      value={r.hoursPerDay}
                      onChange={(e) => handleUpdateLaborRole(i, { hoursPerDay: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-center text-xs text-white"
                    />
                  </Field>
                  <Field label="Taux ($)">
                    <input
                      type="number"
                      min="1"
                      value={r.hourlyRate}
                      onChange={(e) => handleUpdateLaborRole(i, { hourlyRate: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-center text-xs text-white"
                    />
                  </Field>
                </div>
                <div className="text-[10px] text-slate-400 text-right font-mono">
                  Sous-total de rôle : <span className="text-orange-400 font-bold">{fmt(r.count * r.days * r.hoursPerDay * r.hourlyRate)}</span>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleAddLaborRole("Chef d'équipe")}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-755 border border-slate-700/80 rounded-lg text-[10px] font-bold text-slate-200 transition-colors"
                >
                  + Chef d'équipe
                </button>
                <button
                  type="button"
                  onClick={() => handleAddLaborRole("Contremaître")}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-755 border border-slate-700/80 rounded-lg text-[10px] font-bold text-slate-200 transition-colors"
                >
                  + Contremaître
                </button>
                <button
                  type="button"
                  onClick={() => handleAddLaborRole("Journalier")}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-755 border border-slate-700/80 rounded-lg text-[10px] font-bold text-slate-200 transition-colors"
                >
                  + Journalier
                </button>
              </div>

              {(state.directCosts.laborRoles || []).length > 0 && (
                <div className="text-xs font-mono font-bold text-slate-300">
                  Total Rôles : <span className="text-orange-400 text-sm font-extrabold">{fmt(laborTotal)}</span>
                </div>
              )}
            </div>

            {(!state.directCosts.laborRoles || state.directCosts.laborRoles.length === 0) && (
              <div className="mt-4 p-4 border border-dashed border-slate-800 rounded-xl bg-slate-900/25">
                <p className="text-[10px] text-slate-500 mb-3 uppercase tracking-wider font-semibold">Aucun rôle détaillé — utilisation de l'équipe globale :</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Employés">
                    <input
                      type="number"
                      min="1"
                      value={state.directCosts.labor.employees}
                      onChange={(e) => setState((prev) => ({
                        ...prev,
                        directCosts: {
                          ...prev.directCosts,
                          labor: { ...prev.directCosts.labor, employees: Math.max(1, Number(e.target.value)) }
                        }
                      }))}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white"
                    />
                  </Field>
                  <Field label="Jours">
                    <input
                      type="number"
                      min="1"
                      value={state.directCosts.labor.days}
                      onChange={(e) => setState((prev) => ({
                        ...prev,
                        directCosts: {
                          ...prev.directCosts,
                          labor: { ...prev.directCosts.labor, days: Math.max(1, Number(e.target.value)) }
                        }
                      }))}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white"
                    />
                  </Field>
                  <Field label="H / Jr">
                    <input
                      type="number"
                      min="1"
                      value={state.directCosts.labor.hoursPerDay}
                      onChange={(e) => setState((prev) => ({
                        ...prev,
                        directCosts: {
                          ...prev.directCosts,
                          labor: { ...prev.directCosts.labor, hoursPerDay: Math.max(1, Number(e.target.value)) }
                        }
                      }))}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white"
                    />
                  </Field>
                  <Field label="Taux Moyen ($)">
                    <input
                      type="number"
                      min="1"
                      value={state.directCosts.labor.hourlyRate}
                      onChange={(e) => setState((prev) => ({
                        ...prev,
                        directCosts: {
                          ...prev.directCosts,
                          labor: { ...prev.directCosts.labor, hourlyRate: Math.max(1, Number(e.target.value)) }
                        }
                      }))}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white"
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>
        </Section>
      ) : (
        <Section title="Main-d'œuvre globale (Catégorie A)" icon={<span>🪚</span>}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Nombre d'employés" hint="Total sur le chantier">
              <input
                type="number"
                min="1"
                value={state.directCosts.labor.employees}
                onChange={(e) => setState((prev) => ({
                  ...prev,
                  directCosts: {
                    ...prev.directCosts,
                    labor: { ...prev.directCosts.labor, employees: Math.max(1, Number(e.target.value)) }
                  }
                }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white"
              />
            </Field>
            <Field label="Jours estimés" hint="Durée estimée totale">
              <input
                type="number"
                min="1"
                value={state.directCosts.labor.days}
                onChange={(e) => setState((prev) => ({
                  ...prev,
                  directCosts: {
                    ...prev.directCosts,
                    labor: { ...prev.directCosts.labor, days: Math.max(1, Number(e.target.value)) }
                  }
                }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white"
              />
            </Field>
            <Field label="Heures / jour" hint="Journée moyenne type (ex: 8)">
              <input
                type="number"
                min="1"
                value={state.directCosts.labor.hoursPerDay}
                onChange={(e) => setState((prev) => ({
                  ...prev,
                  directCosts: {
                    ...prev.directCosts,
                    labor: { ...prev.directCosts.labor, hoursPerDay: Math.max(1, Number(e.target.value)) }
                  }
                }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white"
              />
            </Field>
            <Field label="Taux Moyen ($ / h)" hint="Salaire horaire chargé">
              <input
                type="number"
                min="1"
                value={state.directCosts.labor.hourlyRate}
                onChange={(e) => setState((prev) => ({
                  ...prev,
                  directCosts: {
                    ...prev.directCosts,
                    labor: { ...prev.directCosts.labor, hourlyRate: Math.max(1, Number(e.target.value)) }
                  }
                }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white"
              />
            </Field>
          </div>
          <div className="text-[10px] text-slate-400 text-right font-mono mt-1">
            Total Main d'œuvre directe : <span className="text-orange-400 font-bold">{fmt(laborTotal)}</span>
          </div>
        </Section>
      )}

      {/* 2. MATÉRIAUX (Materials Section) */}
      <Section title="Matériaux requis (A)" icon={<span>📦</span>}>
        {isQuick ? (
          <Field label="Estimation globale du matériel ($)" hint="Saisissez un coût forfaitaire estimand.">
            <input
              type="number"
              placeholder="Ex: 1200"
              value={state.directCosts.materialsEstimation || ""}
              onChange={(e) => setState((prev) => ({
                ...prev,
                directCosts: { ...prev.directCosts, materialsEstimation: Number(e.target.value) }
              }))}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white"
            />
          </Field>
        ) : (
          <div className="space-y-4">
            <Field label="Estimation globale ($)" hint="Sert d'alternative si aucun matériau détaillé n'est listé ci-dessous.">
              <input
                type="number"
                placeholder="Ex: 1000"
                value={state.directCosts.materialsEstimation || ""}
                onChange={(e) => setState((prev) => ({
                  ...prev,
                  directCosts: { ...prev.directCosts, materialsEstimation: Number(e.target.value) }
                }))}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white"
              />
            </Field>

            {/* Matériau detailed additions */}
            <div className="p-3 bg-slate-905 border border-slate-850 rounded-xl space-y-3">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Ajouter un matériau par ligne</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Nom du matériau (ex: Béton 35Mpa)"
                  value={newMatName}
                  onChange={(e) => setNewMatName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium text-white"
                />
                <input
                  type="number"
                  placeholder="Qté"
                  value={newMatQty}
                  onChange={(e) => setNewMatQty(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-16 px-2 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white"
                />
                <input
                  type="number"
                  placeholder="Prix unité"
                  value={newMatUnitPrice}
                  onChange={(e) => setNewMatUnitPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-24 px-2 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white"
                />
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-xs font-bold transition-transform text-white flex items-center gap-1 shrink-0"
                >
                  <Plus size={14} /> Ajouter
                </button>
              </div>
            </div>

            {/* Render items */}
            {state.directCosts.materialsDetailed.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {state.directCosts.materialsDetailed.map((m) => (
                  <div key={m.id} className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-200 font-bold">{m.name}</span>
                      {m.quantity && m.unitPrice ? (
                        <span className="text-[10px] text-slate-500 ml-2">
                          ({m.quantity} × {fmt(m.unitPrice)})
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-orange-400 font-bold">{fmt(m.cost)}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteMaterial(m.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="text-[10px] text-slate-400 font-mono text-right mt-1">
                  Somme du devis matériel : <span className="text-orange-400 font-extrabold">{fmt(mDetailedTotal)}</span>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-500 text-center py-2">Aucun matériau saisi en détail.</div>
            )}
          </div>
        )}
      </Section>

      {/* 3. SUB-CONTRACTING & SERVICES (Standard/Pro options) */}
      {!isQuick && (
        <Section title="Sous-traitance & Équipements de location (A)" icon={<span>🤝</span>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Subcontractor section */}
            <div className="space-y-3">
              <label className="block text-[11px] uppercase font-bold text-slate-400">Main-d'œuvre spécialisée tierce</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ex: Électricien sous-traitant"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                />
                <input
                  type="number"
                  placeholder="Prix ($)"
                  value={newSubCost}
                  onChange={(e) => setNewSubCost(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-24 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddSubcontractor}
                  className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-500 rounded-lg text-xs"
                >
                  +
                </button>
              </div>

              {state.directCosts.subcontractors.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {state.directCosts.subcontractors.map((s) => (
                    <div key={s.id} className="flex justify-between items-center bg-slate-900/40 p-2 rounded-lg text-xs">
                      <span className="text-slate-300">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-orange-400 font-bold">{fmt(s.cost)}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubcontractor(s.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-slate-600 py-1">Aucun contrat intermédiaire.</div>
              )}
            </div>

            {/* Equipment direct amount */}
            <Field label="Location d'Équipements ($)" hint="Pelles d'excavation, nacelles, outils d'installation spécialisés.">
              <input
                type="number"
                placeholder="Ex: 450"
                value={state.directCosts.equipments || ""}
                onChange={(e) => setState((prev) => ({
                  ...prev,
                  directCosts: { ...prev.directCosts, equipments: Number(e.target.value) }
                }))}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white"
              />
            </Field>

          </div>
        </Section>
      )}

      {/* 4. LOGISTIQUE & DÉPLACEMENT (Transactional B) */}
      <Section title="Logistique de déplacement (Catégorie B)" icon={<span>🚚</span>}>
        {isQuick ? (
          <Field label="Frais de transport généraux" hint="Frais de route globaux simulés automatiquement.">
            <select
              value={state.transactionalCosts.travelLevel}
              onChange={(e) => setState((prev) => ({
                ...prev,
                transactionalCosts: { ...prev.transactionalCosts, travelLevel: e.target.value as LevelType }
              }))}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white"
            >
              <option value="Faible">Faible (~50 $)</option>
              <option value="Moyen">Moyen (~200 $)</option>
              <option value="Élevé">Élevé (~500 $)</option>
            </select>
          </Field>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Distance aller (km)" hint="Distance bureau-chantier">
              <input
                type="number"
                value={state.transactionalCosts.travelDistanceKm || ""}
                onChange={(e) => setState((prev) => ({
                  ...prev,
                  transactionalCosts: { ...prev.transactionalCosts, travelDistanceKm: Number(e.target.value) }
                }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white"
              />
            </Field>
            <Field label="Fréquence (Allers total)" hint="Nombre d'allers/retours d'équipe">
              <input
                type="number"
                value={state.transactionalCosts.travelFrequency || ""}
                onChange={(e) => setState((prev) => ({
                  ...prev,
                  transactionalCosts: { ...prev.transactionalCosts, travelFrequency: Number(e.target.value) }
                }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white"
              />
            </Field>
            <Field label="Coût / km ($)" hint="Normalisé à 0.65$/km">
              <input
                type="number"
                step="0.01"
                value={state.transactionalCosts.travelRatePerKm || 0.65}
                onChange={(e) => setState((prev) => ({
                  ...prev,
                  transactionalCosts: { ...prev.transactionalCosts, travelRatePerKm: Number(e.target.value) }
                }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white"
              />
            </Field>
          </div>
        )}
      </Section>

      {/* 5. PERMIS & LICENCES LICENSING */}
      {!isQuick && (
        <Section title="Permis municipaux et conformité (B)" icon={<span>🛡️</span>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Permis de construction requis ($)" hint="Frais de demande et licence officielle requis.">
              <input
                type="number"
                placeholder="0"
                value={state.transactionalCosts.permisDetailed || ""}
                onChange={(e) => setState((prev) => ({
                  ...prev,
                  transactionalCosts: { ...prev.transactionalCosts, permisDetailed: Number(e.target.value) }
                }))}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white"
              />
            </Field>
            <Field label="Accès & Logistique  ($)" hint="Frais d'accès restreint, sécurité, etc.">
              <input
                type="number"
                placeholder="0"
                value={state.transactionalCosts.conformityAccess || ""}
                onChange={(e) => setState((prev) => ({
                  ...prev,
                  transactionalCosts: { ...prev.transactionalCosts, conformityAccess: Number(e.target.value) }
                }))}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white"
              />
            </Field>
          </div>
        </Section>
      )}

      {/* 6. COÛT D'ACQUISITION CLIENTS (CacSection) */}
      <CacSection state={state} setState={setState} isQuick={isQuick} isPro={isPro} />

      {/* 7. STRUCTURE D'OVERHEAD ADMIN */}
      {!isQuick && (
        isPro ? (
          <Section title="Overhead & Dépenses Fixes Mensuelles" icon={<span>🏢</span>} hint="Saisir des frais fixes par catégorie.">
            <div className="space-y-2">
              {(state.businessCosts.overheadDetailed || []).map((o, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">
                    {i === 0 && <label className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Poste fixe</label>}
                    <input
                      type="text"
                      placeholder="ex: Loyer, Assurances"
                      value={o.label}
                      onChange={(e) => handleUpdateOverheadLine(i, { label: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                    />
                  </div>
                  <div className="ml-1">
                    {i === 0 && <label className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Montant ($)</label>}
                    <input
                      type="number"
                      placeholder="Amount"
                      value={o.amount || ""}
                      onChange={(e) => handleUpdateOverheadLine(i, { amount: Number(e.target.value) })}
                      className="w-24 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveOverheadLine(i)}
                    className="p-1.5 bg-red-950/20 text-red-500 rounded-lg border border-red-900/30"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleAddOverheadLine}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] uppercase font-bold"
                >
                  + Ajouter un frais
                </button>

                {(state.businessCosts.overheadDetailed || []).length > 0 && (
                  <div className="text-xs font-mono font-bold text-slate-400">
                    Total : {fmt(state.businessCosts.overheadDetailed ? state.businessCosts.overheadDetailed.reduce((s, x) => s + x.amount, 0) : 0)}
                  </div>
                )}
              </div>

              {(!state.businessCosts.overheadDetailed || state.businessCosts.overheadDetailed.length === 0) && (
                <Field label="Ou Dépense Overhead d'administration globale" hint="Permet d'affecter un montant fixe global au projet.">
                  <input
                    type="number"
                    placeholder="Ex: 250"
                    value={state.businessCosts.overheadMonthly || ""}
                    onChange={(e) => setState((prev) => ({
                      ...prev,
                      businessCosts: { ...prev.businessCosts, overheadMonthly: Number(e.target.value) }
                    }))}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white"
                  />
                </Field>
              )}
            </div>
          </Section>
        ) : (
          <Section title="Allocations des frais fixes d'opération (C)" icon={<span>🏢</span>}>
            <Field label="Affectation d'overhead (%)" hint="La portion des frais fixes généraux imputée au projet. Un taux de 15% de la main-d'œuvre directe est recommandé.">
              <input
                type="number"
                min="0"
                max="100"
                value={state.businessCosts.overheadLaborAllocationPercent || 15}
                onChange={(e) => setState((prev) => ({
                  ...prev,
                  businessCosts: { ...prev.businessCosts, overheadLaborAllocationPercent: Number(e.target.value) }
                }))}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white"
              />
            </Field>
          </Section>
        )
      )}

      {/* 8. BUFFER DE SÉCURITÉ DE RÉSILIENCE */}
      <Section title="Buffer analytique de sécurité" icon={<span>🛡️</span>}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Pourcentage de protection pour les imprévus :</span>
            <span className="text-lg font-black text-orange-500 font-mono">{state.resilience.bufferPercent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            value={state.resilience.bufferPercent}
            onChange={(e) => setState((prev) => ({
              ...prev,
              resilience: { bufferPercent: Number(e.target.value) }
            }))}
            className="w-full accent-orange-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
          />
          <p className="text-[10px] text-slate-500 bg-slate-950/40 p-3 rounded-lg border border-slate-900 leading-relaxed italic">
            💡 Conseil {state.measurement.tradeType} : {tradeProfile.tips}
          </p>
        </div>
      </Section>
    </div>
  );
}

/* ========================================================================= */
/* CAC COUTS D'ACQUISITION CLIENT COMPONENT                                */
/* ========================================================================= */
interface CacSectionProps {
  state: SimulationState;
  setState: React.Dispatch<React.SetStateAction<SimulationState>>;
  isQuick: boolean;
  isPro: boolean;
}

function CacSection({ state, setState, isQuick, isPro }: CacSectionProps) {
  const [cacMode, setCacMode] = useState<"direct" | "calculate">(
    isPro && state.businessCosts.cacConversionRate > 0 ? "calculate" : "direct"
  );

  // Temporary pipeline properties initialized from state if present
  const [pipelineLeads, setPipelineLeads] = useState<number>(30);
  const [rawCostPerLead, setRawCostPerLead] = useState<number>(15);

  const calculatedCAC = state.businessCosts.cacConversionRate > 0
    ? (rawCostPerLead * pipelineLeads) / ((state.businessCosts.cacConversionRate / 100) * pipelineLeads)
    : 0;

  useEffect(() => {
    if (cacMode === "calculate" && state.businessCosts.cacConversionRate > 0) {
      // costPerLead saved in cacRealMarketing for formulas of pricingEngine
      setState((prev) => ({
        ...prev,
        businessCosts: {
          ...prev.businessCosts,
          cacRealMarketing: rawCostPerLead,
        },
      }));
    }
  }, [rawCostPerLead, state.businessCosts.cacConversionRate, cacMode]);

  if (isQuick) {
    return (
      <Section title="Coût d'Acquisition Client (CAC)" icon={<span>📈</span>} hint="Frais publicitaires de conversion client.">
        <Field label="Niveau marketing requis">
          <select
            value={state.businessCosts.cacLevel}
            onChange={(e) => setState((prev) => ({
              ...prev,
              businessCosts: { ...prev.businessCosts, cacLevel: e.target.value as LevelType }
            }))}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
          >
            <option value="Faible">Faible (~50 $)</option>
            <option value="Moyen">Moyen (~200 $)</option>
            <option value="Élevé">Élevé (~500 $)</option>
          </select>
        </Field>
      </Section>
    );
  }

  return (
    <Section title="Coût d'Acquisition Client (CAC)" icon={<span>📈</span>} hint="Le CAC mesure combien dépenser pour obtenir ce contrat (conception, soumissions perdues).">
      <div className="flex gap-2.5 mb-2">
        <button
          type="button"
          onClick={() => setCacMode("direct")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${
            cacMode === "direct"
              ? "bg-orange-600 text-white"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          Montant estimé simple
        </button>
        <button
          type="button"
          onClick={() => setCacMode("calculate")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${
            cacMode === "calculate"
              ? "bg-orange-600 text-white"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          Calculer via entonnoir pipeline
        </button>
      </div>

      {cacMode === "direct" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="CAC estimé forfaitaire ($)" hint="Combien coûte le démarchage de ce projet.">
            <input
              type="number"
              placeholder="ex: 200"
              value={state.businessCosts.cacRealMarketing || ""}
              onChange={(e) => setState((prev) => ({
                ...prev,
                businessCosts: { ...prev.businessCosts, cacRealMarketing: Number(e.target.value) }
              }))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-sm text-white"
            />
          </Field>
          <Field label="Classe de CAC alternative (Fallback)" hint="Sélecteur secondaire">
            <select
              value={state.businessCosts.cacLevel}
              onChange={(e) => setState((prev) => ({
                ...prev,
                businessCosts: { ...prev.businessCosts, cacLevel: e.target.value as LevelType }
              }))}
              className="w-full px-3 py-2 bg-slate-905 border border-slate-800 rounded-xl text-xs"
            >
              <option value="Faible">Faible (~50 $)</option>
              <option value="Moyen">Moyen (~200 $)</option>
              <option value="Élevé">Élevé (~500 $)</option>
            </select>
          </Field>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[10px] text-slate-500">Données clés de l'entonnoir commercial :</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Leads Totaux">
              <input
                type="number"
                value={pipelineLeads}
                onChange={(e) => setPipelineLeads(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white"
              />
            </Field>
            <Field label="Taux Conversion (%)">
              <input
                type="number"
                min="1"
                max="100"
                value={state.businessCosts.cacConversionRate || 10}
                onChange={(e) => setState((prev) => ({
                  ...prev,
                  businessCosts: { ...prev.businessCosts, cacConversionRate: Math.max(1, Number(e.target.value)) }
                }))}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white"
              />
            </Field>
            <Field label="Coût / Lead ($)">
              <input
                type="number"
                value={rawCostPerLead}
                onChange={(e) => setRawCostPerLead(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white"
              />
            </Field>
          </div>

          {calculatedCAC > 0 && (
            <div className="p-3 bg-orange-600/10 border border-orange-500/20 rounded-xl flex justify-between text-xs font-mono">
              <span className="text-slate-400">CAC réel par projet calculé</span>
              <span className="text-orange-400 font-extrabold">{fmt(calculatedCAC)}</span>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

/* ========================================================================= */
/* STEP 3: MARGE & PRIX RECOMMANDÉ COMPONENT                                   */
/* ========================================================================= */
interface StepMarginProps {
  state: SimulationState;
  setState: React.Dispatch<React.SetStateAction<SimulationState>>;
}

function StepMargin({ state, setState }: StepMarginProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Marge & Prix cible</h2>
        <p className="text-xs text-slate-400">Configurez l'écart bénéficiaire requis et comparez vos devis.</p>
      </div>

      <Hint text="La marge cible est le profit brut de sécurité résiduel visé. Le moteur d'analyse rétro-calcule alors un prix de soumission rigoureux pour absorber sans peine tous les frais d'opération." />

      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/30 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Margin Type */}
          <Field label="Type de calcul de marge" hint="Déterminez comment le bénéfice est modélisé.">
            <select
              value={state.margin.type}
              onChange={(e) => setState((prev) => ({
                ...prev,
                margin: { ...prev.margin, type: e.target.value as "percent" | "amount" }
              }))}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm font-bold text-white"
            >
              <option value="percent">Pourcentage (%)</option>
              <option value="amount">Montant Dollar Fixe ($)</option>
            </select>
          </Field>

          {/* Margin Value */}
          <Field
            label={state.margin.type === "percent" ? "Ratio de marge cible (%)" : "Montant à dégager ($)"}
            hint={state.margin.type === "percent" ? "Valeur typique : 20% à 35% de marge brute sur contrat." : "Coût net final ajouté."}
          >
            <input
              type="number"
              min="1"
              value={state.margin.targetValue}
              onChange={(e) => setState((prev) => ({
                ...prev,
                margin: { ...prev.margin, targetValue: Math.max(1, Number(e.target.value)) }
              }))}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/40 font-mono font-bold text-sm text-white"
            />
          </Field>

        </div>

        {/* Target Price */}
        <div className="border-t border-slate-850 pt-4">
          <Field
            label="Prix proposé estimé au client (Optionnel, $)"
            hint="Si laissé à zéro ou vide, le moteur calculera le devis idéal de façon autonome."
          >
            <input
              type="number"
              placeholder="Saisissez votre offre si déjà arrêtée..."
              value={state.margin.proposedPrice || ""}
              onChange={(e) => setState((prev) => ({
                ...prev,
                margin: { ...prev.margin, proposedPrice: e.target.value ? Number(e.target.value) : undefined }
              }))}
              className="w-full px-4 py-3 bg-slate-905 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm font-mono text-white"
            />
          </Field>
        </div>

      </div>
    </div>
  );
}

/* ========================================================================= */
/* STEP 4: SCORE STRATÉGIQUE COMPONENT                                       */
/* ========================================================================= */
interface StepStrategicProps {
  state: SimulationState;
  setState: React.Dispatch<React.SetStateAction<SimulationState>>;
}

function StepStrategic({ state, setState }: StepStrategicProps) {
  const sum =
    (state.strategicScore.clientValue || 0) +
    (state.strategicScore.portfolioEffect || 0) +
    (state.strategicScore.acquisitionFuture || 0) +
    (state.strategicScore.operationalAlignment || 0);

  const level = sum <= 3 ? "Faible" : sum <= 7 ? "Moyen" : "Élevé";
  const levelColor = sum <= 3 ? "text-red-400" : sum <= 7 ? "text-amber-400" : "text-emerald-400";

  const handleScoreChange = (key: keyof typeof state.strategicScore, val: number) => {
    setState((prev) => ({
      ...prev,
      strategicScore: {
        ...prev.strategicScore,
        [key]: val,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Score stratégique</h2>
        <p className="text-xs text-slate-400">Évaluez l'importance qualitative du dossier pour forcer des décisons clés.</p>
      </div>

      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/30 space-y-6">
        {STRATEGIC_CRITERIA.map((criterion) => {
          const currentVal = state.strategicScore[criterion.key] || 0;
          return (
            <div key={criterion.key} className="space-y-2">
              <div className="flex justify-between items-baseline mb-1">
                <label className="block text-xs font-bold text-slate-200">{criterion.label}</label>
                <span className="text-xs font-mono font-black text-orange-400">{currentVal} / 3</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal mb-2">{criterion.desc}</p>
              
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleScoreChange(criterion.key, v)}
                    className={`flex-1 py-1 px-3 text-xs font-mono font-bold rounded-lg border transition-all ${
                      currentVal === v
                        ? "bg-orange-600/20 border-orange-500 text-orange-400 scale-[1.02] font-black"
                        : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {v === 0 ? "Non" : v === 1 ? "Faible" : v === 2 ? "Moyen" : "Critique"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t border-slate-850 flex justify-between items-center text-sm">
          <span className="text-slate-400">Score de Portefeuille Global calculé</span>
          <span className={`text-lg font-extrabold font-mono ${levelColor}`}>
            {sum} / 12 <span className="text-xs font-normal">({level})</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* STEP 5: ANALYSE PRO ASSURANCE ET CAPACITÉ COMPONENT                       */
/* ========================================================================= */
interface StepProAnalysisProps {
  state: SimulationState;
  setState: React.Dispatch<React.SetStateAction<SimulationState>>;
}

function StepProAnalysis({ state, setState }: StepProAnalysisProps) {
  // Ensure proCapacity parameters exist in local rendering
  const proCap = state.proCapacity || {
    currentCapacityPercent: 45,
    clientSegment: "Régulier",
    activeProjects: 4,
    maxProjects: 10,
    lifetimeValue: 12000,
    isRecurring: true,
  };

  const updateProCapacity = (partial: Partial<typeof proCap>) => {
    setState((prev) => ({
      ...prev,
      proCapacity: {
        ...proCap,
        ...partial,
      },
    }));
  };

  // Human readable segments lists
  const segments = ["Régulier", "Nouveau", "Opportunité", "Partenariat"];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Analyse avancée Pro</h2>
        <p className="text-xs text-slate-400">Contrôlez les contraintes d'équipe interne et segmentez l'effort portefeuille.</p>
      </div>

      {/* 1. Capacité */}
      <Section title="Capacité opérationnelle" icon={<BarChart3 size={15} className="text-orange-500" />}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-xs uppercase font-bold tracking-wider text-slate-400">Taux d'utilisation actuel de l'équipe</label>
              <span className="text-base font-extrabold text-orange-400 font-mono">{proCap.currentCapacityPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={proCap.currentCapacityPercent}
              onChange={(e) => updateProCapacity({ currentCapacityPercent: Number(e.target.value) })}
              className="w-full h-2 accent-orange-500 bg-slate-900 rounded-lg cursor-pointer appearance-none animate-pulse"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Sous-utilisé (&lt;50%)</span>
              <span>Tension opérationnelle (85%+)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Projets actifs">
              <input
                type="number"
                value={proCap.activeProjects || 0}
                onChange={(e) => updateProCapacity({ activeProjects: Math.max(0, Number(e.target.value)) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-center text-xs text-white"
              />
            </Field>
            <Field label="Capacité maximum (Seuil)">
              <input
                type="number"
                value={proCap.maxProjects || 10}
                onChange={(e) => updateProCapacity({ maxProjects: Math.max(1, Number(e.target.value)) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-center text-xs text-white"
              />
            </Field>
          </div>

          {proCap.currentCapacityPercent >= 80 && (
            <div className="p-3 bg-red-950/25 border border-red-900/30 text-xs text-red-300 rounded-xl leading-relaxed">
              ⚠️ Alerte surcharge de goulot d'étranglement — accepter ce projet risque de grever vos chantiers prioritaires. Considérez de hausser le buffer ou de gonfler votre tarification.
            </div>
          )}

          {proCap.currentCapacityPercent < 50 && (
            <div className="p-3 bg-emerald-950/25 border border-emerald-900/30 text-xs text-emerald-300 rounded-xl leading-relaxed">
              💡 Forte capacité improductive libre détectée — idéal pour placer ce dossier rapidement, même à marge modeste, pour éponger vos dépenses fixes mensuelles d'opérations.
            </div>
          )}
        </div>
      </Section>

      {/* 2. Segmentation */}
      <Section title="Segmentation Portefeuille Client" icon={<Users size={15} className="text-orange-500" />}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <Field label="Segment tactique">
              <select
                value={proCap.clientSegment}
                onChange={(e) => updateProCapacity({ clientSegment: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white"
              >
                {segments.map((seg) => (
                  <option key={seg} value={seg}>{seg}</option>
                ))}
              </select>
            </Field>

            <Field label="Valeur à vie estimée (LTV, $)">
              <input
                type="number"
                value={proCap.lifetimeValue || 0}
                onChange={(e) => updateProCapacity({ lifetimeValue: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white"
              />
            </Field>

          </div>

          {/* Recurrent Switch */}
          <div className="p-3.5 bg-slate-900/40 border border-slate-850 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="block text-xs font-bold text-slate-200">Client fidèle récurrent</span>
              <span className="text-[10px] text-slate-500">Le client a déjà passé commande dans le passé.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={proCap.isRecurring}
                onChange={(e) => updateProCapacity({ isRecurring: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-350 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600" />
            </label>
          </div>

          {proCap.isRecurring && proCap.lifetimeValue > 10000 && (
            <div className="p-3 bg-orange-600/5 border border-orange-500/10 text-xs text-slate-300 rounded-xl">
              🤝 Partenariat clé (LTV &gt; 10 k$) — une ristourne stratégique ou un effort d'alignement est suggéré pour conserver l'exclusivité du compte.
            </div>
          )}
        </div>
      </Section>

      {/* 3. Recap */}
      <Section title="Simulation d'Impact Portefeuille" icon={<Briefcase size={15} className="text-orange-500" />}>
        <div className="p-4 bg-slate-950/70 border border-slate-900 rounded-xl space-y-3 font-mono text-[11px] leading-relaxed">
          <div className="flex justify-between border-b border-slate-900 pb-1.5">
            <span className="text-slate-500">Charges Actives / Max</span>
            <span className="text-slate-300 font-bold">{proCap.activeProjects} / {proCap.maxProjects}</span>
          </div>
          <div className="flex justify-between border-b border-slate-900 pb-1.5">
            <span className="text-slate-500">Taux occupation équipe</span>
            <span className="text-orange-400 font-bold">{proCap.currentCapacityPercent}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Segmentation portefeuille</span>
            <span className="text-slate-300 font-bold">{proCap.clientSegment} {proCap.isRecurring ? "• Récurrent" : ""}</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
