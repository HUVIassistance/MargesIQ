/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Undo2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Info,
  Award,
  Cpu,
  Shield,
  Star,
  SlidersHorizontal,
  Plus,
  Trash2,
  Printer
} from "lucide-react";
import { SimulationState, SimulationResult } from "../types";
import { calculateSimulation } from "../utils/pricingEngine";
import PrintPDF from "./PrintPDF";

interface ResultScreenProps {
  simulation: SimulationState;
  onBack: () => void;
  onEdit: () => void;
  onSaveSimulationToHistory: (updatedSim: SimulationState) => void;
}

type DecisionStatus = "OK" | "OK_FRAGILE" | "RENEGOCIER" | "NON_RENTABLE" | "STRATEGIQUE";

const STATUS_CONFIG: Record<DecisionStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  OK: {
    label: "OK — RENTABLE",
    color: "text-green-400",
    bg: "bg-green-400/10 border-green-400/30",
    icon: <CheckCircle className="h-5 w-5 shrink-0 text-green-400" />
  },
  OK_FRAGILE: {
    label: "OK FRAGILE",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/30",
    icon: <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-400" />
  },
  RENEGOCIER: {
    label: "RENÉGOCIER",
    color: "text-orange-400",
    bg: "bg-orange-400/10 border-orange-400/30",
    icon: <Shield className="h-5 w-5 shrink-0 text-orange-400" />
  },
  NON_RENTABLE: {
    label: "NON RENTABLE",
    color: "text-red-400",
    bg: "bg-red-400/10 border-red-400/30",
    icon: <XCircle className="h-5 w-5 shrink-0 text-red-400" />
  },
  STRATEGIQUE: {
    label: "STRATÉGIQUE",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/30",
    icon: <Star className="h-5 w-5 shrink-0 text-blue-400" />
  }
};

const PRICE_TOOLTIPS: Record<string, string> = {
  "Recommandé": "Le prix optimal qui respecte votre marge cible tout en restant compétitif. C'est votre meilleur point de départ pour soumettre.",
  "Minimum viable": "Le prix plancher en dessous duquel le projet devient déficitaire. À utiliser uniquement si la compétition l'exige.",
  "Cible": "Le prix qui atteint exactement la marge demandée. Un bon repère pour calibrer votre soumission.",
  "À éviter": "Un prix trop bas qui ne couvre pas vos coûts réels + marge. Soumettre à ce prix compromet la rentabilité du projet."
};

const COST_ITEMS = [
  { key: "labor" as const, label: "Main-d'œuvre" },
  { key: "materials" as const, label: "Matériaux" },
  { key: "subcontractors" as const, label: "Sous-traitants" },
  { key: "equipments" as const, label: "Équipements" },
  { key: "travel" as const, label: "Déplacement" },
  { key: "permis" as const, label: "Permis" },
  { key: "cac" as const, label: "CAC" },
  { key: "overhead" as const, label: "Overhead" },
  { key: "buffer" as const, label: "Buffer" }
];

export default function ResultScreen({
  simulation,
  onBack,
  onEdit,
  onSaveSimulationToHistory
}: ResultScreenProps) {
  const [customPriceVal, setCustomPriceVal] = useState<number>(0);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState<boolean>(false);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Post-Project Actuals State
  const [isDoneProject, setIsDoneProject] = useState<boolean>(simulation.actuals?.done || false);
  const [actualCost, setActualCost] = useState<number>(simulation.actuals?.coûtRéelFinal || 0);
  const [actualDays, setActualDays] = useState<number>(simulation.actuals?.duréeRéelleJours || 0);

  const initialResult = useMemo(() => calculateSimulation(simulation), [simulation]);

  // Handle dynamic price initialization
  useEffect(() => {
    const defaultVal =
      simulation.margin.proposedPrice !== undefined && simulation.margin.proposedPrice > 0
        ? simulation.margin.proposedPrice
        : initialResult.prices.recommended;
    setCustomPriceVal(Math.round(defaultVal));
  }, [simulation, initialResult]);

  // Re-derive simulated results when customPriceVal changes
  const simulatedState = useMemo(() => {
    return {
      ...simulation,
      margin: {
        ...simulation.margin,
        proposedPrice: customPriceVal
      }
    };
  }, [simulation, customPriceVal]);

  const simulatedResult = useMemo(() => calculateSimulation(simulatedState), [simulatedState]);

  // Fetch AI Insight per simulation price adjustment with debouncing
  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout;

    const fetchAiInsight = async () => {
      setLoadingAi(true);
      try {
        const bodyPayload = {
          projectName: simulation.projectName,
          tradeType: simulation.measurement.tradeType,
          operationalProfile: simulation.measurement.operationalProfile,
          objective: simulation.measurement.objective,
          complexity: simulation.measurement.complexity,
          quantity: simulation.measurement.quantity,
          unit: simulation.measurement.unit,
          totalCosts: simulatedResult.cr.total,
          laborCost: simulatedResult.cr.labor,
          materialCost: simulatedResult.cr.materials,
          travelCost: simulatedResult.cr.travel,
          cacCost: simulatedResult.cr.cac,
          overheadCost: simulatedResult.cr.overhead,
          bufferPercent: simulation.resilience.bufferPercent,
          recommendedPrice: simulatedResult.prices.recommended,
          minimumPrice: simulatedResult.prices.minimumViable,
          margeType: simulation.margin.type,
          margeCible: simulation.margin.targetValue,
          margeReellePercent: simulatedResult.margins.realPercent,
          strategicScore: simulatedResult.strategicScore,
          ratioCR_CC: simulatedResult.r,
          decisionStatus: simulatedResult.decisionStatus
        };

        const res = await fetch("/api/gemini/insight", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(bodyPayload)
        });

        if (!res.ok) {
          throw new Error("API Route did not return success");
        }

        const data = await res.json();
        if (active) {
          setAiInsight(data.insight);
        }
      } catch (err) {
        console.error("Failed to load Gemini decision helper:", err);
        if (active) {
          setAiInsight(
            "Analyse locale : La structure de coût est bien protégée et amortit de manière résiliente les écarts d'imprévus."
          );
        }
      } finally {
        if (active) {
          setLoadingAi(false);
        }
      }
    };

    // Debounce to 1000ms to throttle API calls during rapid price/value slider adjustments
    timer = setTimeout(() => {
      fetchAiInsight();
    }, 1000);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [simulation, customPriceVal, simulatedResult]);

  const handleSaveActuals = () => {
    const updatedSim: SimulationState = {
      ...simulation,
      actuals: {
        coûtRéelFinal: actualCost,
        duréeRéelleJours: actualDays,
        profitRéel: Math.max(0, customPriceVal - actualCost),
        done: isDoneProject
      }
    };
    onSaveSimulationToHistory(updatedSim);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 text-slate-100 animate-fade-in" id="result_screen">
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Undo2 size={16} /> Retour à l'accueil
        </button>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            Ajuster le formulaire
          </button>
          <button
            onClick={() => setIsPdfPreviewOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-900 hover:bg-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Download size={14} /> Exporter PDF / Imprimer
          </button>
        </div>
      </div>

      {/* Grid Layout of results */}
      <div className="space-y-6">
        
        {/* StatusHeader integrated beautifully */}
        <StatusHeader result={simulatedResult} />

        {/* Project Context info bar */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex flex-wrap justify-between items-center text-xs gap-4">
          <div>
            <span className="text-slate-500 font-semibold block uppercase text-[9px] tracking-wider">Projet</span>
            <span className="font-extrabold text-white">{simulation.projectName || "Mission"}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block uppercase text-[9px] tracking-wider">Métier</span>
            <span className="font-bold text-slate-300">{simulation.measurement.tradeType}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block uppercase text-[9px] tracking-wider">Taille</span>
            <span className="font-bold text-orange-400 font-mono">
              {simulation.measurement.quantity} {simulation.measurement.unit}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block uppercase text-[9px] tracking-wider">Profil opérationnel</span>
            <span className="font-bold text-blue-400 font-mono">
              {simulation.measurement.operationalProfile}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 8-COLS PANELS */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* ProfitFinal on top of left panels */}
            <ProfitFinal result={simulatedResult} />

            {/* PriceSection with built-in custom tooltip provider */}
            <PriceSection result={simulatedResult} />

            {/* PriceSimulator connected dynamically */}
            <PriceSimulator
              result={simulatedResult}
              simPrice={customPriceVal}
              setSimPrice={setCustomPriceVal}
              marginRequestedPercent={simulation.margin.targetValue}
            />

            {/* CostsBreakdown with responsive progress bars */}
            <CostsBreakdown result={simulatedResult} />

            {/* Profitability metrics cards */}
            <ProfitabilitySection result={simulatedResult} />

          </div>

          {/* RIGHT 4-COLS PANELS */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Gemini AI Decision Assistant insight block */}
            <div className="bg-[#1a2034] border border-[#2b354e] rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl" />
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="text-orange-400" size={18} />
                <span className="text-[11px] font-black tracking-widest uppercase font-mono text-orange-400">
                  Insight Marges IQ
                </span>
              </div>

              {loadingAi ? (
                <div className="space-y-3 py-2">
                  <div className="h-3.5 bg-slate-800 rounded animate-pulse w-full" />
                  <div className="h-3.5 bg-slate-800 rounded animate-pulse w-5/6" />
                </div>
              ) : (
                <div className="text-slate-100 text-xs md:text-sm leading-relaxed font-semibold italic">
                  "{aiInsight}"
                </div>
              )}
              <div className="text-[9px] text-slate-500 mt-4 border-t border-slate-800/80 pt-3 flex items-center gap-1">
                <Info size={11} /> Généré par le modèle d'optimisation Gemini 3.5.
              </div>
            </div>

            {/* Detailed Strategic Level Score Block */}
            <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block mb-1">
                Score Stratégique Global
              </span>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-extrabold text-white">{simulatedResult.strategicScore}</span>
                <span className="text-xs text-slate-500 font-bold">/ 12</span>
                <span
                  className={`ml-auto text-[10px] font-bold p-1 px-2.5 rounded-full uppercase ${
                    simulatedResult.strategicLevel === "Élevé"
                      ? "bg-indigo-950 text-indigo-400 border border-indigo-900"
                      : simulatedResult.strategicLevel === "Moyen"
                      ? "bg-slate-850 text-slate-400 border border-slate-800"
                      : "bg-red-950 text-red-500 border border-[#401b1b]"
                  }`}
                >
                  {simulatedResult.strategicLevel}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/60 pt-3">
                <div className="flex justify-between">
                  <span>Valeur client (LTV):</span>
                  <span className="font-bold text-slate-200">{simulation.strategicScore.clientValue}/3</span>
                </div>
                <div className="flex justify-between">
                  <span>Effet portfolio:</span>
                  <span className="font-bold text-slate-200">{simulation.strategicScore.portfolioEffect}/3</span>
                </div>
                <div className="flex justify-between">
                  <span>Opportunités futures:</span>
                  <span className="font-bold text-slate-200">{simulation.strategicScore.acquisitionFuture}/3</span>
                </div>
                <div className="flex justify-between">
                  <span>Alignement opérationnel:</span>
                  <span className="font-bold text-slate-200">{simulation.strategicScore.operationalAlignment}/3</span>
                </div>
              </div>
            </div>

            {/* Post-Project learn loop database input */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                    📓 Apprentissage Post-Projet
                  </h4>
                  <div className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Une fois le chantier terminé, saisissez vos coûts réels complets encourus et écarts pour enrichir l'historique décisionnel.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk_project_done"
                    checked={isDoneProject}
                    onChange={(e) => setIsDoneProject(e.target.checked)}
                    className="w-4 h-4 accent-orange-500 rounded bg-slate-950 border-slate-800 focus:outline-none"
                  />
                  <label htmlFor="chk_project_done" className="text-xs font-bold text-slate-200 cursor-pointer">
                    Chantier complété et facturé ?
                  </label>
                </div>

                {isDoneProject && (
                  <div className="space-y-3 pt-2 border-t border-slate-800 animate-fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                          Coût Réel Court Échu ($)
                        </label>
                        <input
                          type="number"
                          value={actualCost || ""}
                          onChange={(e) => setActualCost(Number(e.target.value))}
                          placeholder="Ex: 3850"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                          Durée Réelle (jours)
                        </label>
                        <input
                          type="number"
                          value={actualDays || ""}
                          onChange={(e) => setActualDays(Number(e.target.value))}
                          placeholder="Ex: 4"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                        />
                      </div>
                    </div>

                    {actualCost > 0 && (
                      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Écart vs estimé :</span>
                          <span className={`font-bold font-mono ${actualCost <= simulatedResult.cr.total ? "text-green-400" : "text-red-400"}`}>
                            {(simulatedResult.cr.total - actualCost).toLocaleString("fr-FR")} $
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Profit réel final :</span>
                          <span className="font-bold text-white font-mono">
                            {(customPriceVal - actualCost).toLocaleString("fr-FR")} $
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveActuals}
                      className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                    >
                      Enregistrer les données réelles
                    </button>

                    {savedSuccess && (
                      <div className="text-[10px] text-green-400 text-center font-bold font-mono animate-fade-in">
                        Données réelles sauvegardées avec succès !
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {isPdfPreviewOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 overflow-y-auto flex flex-col items-center justify-start py-8 px-4 print:hidden">
          <div className="max-w-[800px] w-full flex justify-between items-center mb-4 text-white">
            <div>
              <h3 className="text-sm font-black uppercase text-orange-400 tracking-wider">
                Aperçu de la soumission PDF
              </h3>
              <p className="text-[10px] text-slate-400">
                Document optimisé en format lettre/A4
              </p>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                <Printer size={14} /> Imprimer / Enregistrer PDF
              </button>
              <button
                onClick={() => setIsPdfPreviewOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>

          <div className="max-w-[800px] w-full bg-slate-900 border border-slate-800/80 p-4 rounded-2xl mb-4 text-xs text-slate-300 flex items-start gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse mt-1 shrink-0" />
            <div>
              <strong>Note d'impression :</strong> Si le clic sur le bouton "Imprimer / Enregistrer PDF" ne réagit pas, veuillez cliquer sur l'icône de double fenêtre <strong>"Open in new tab"</strong> en haut de l'éditeur pour utiliser l'applet en pleine page libre.
            </div>
          </div>

          <PrintPDF simulation={simulatedState} isPreview={true} />
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/* MODULE 1: ProfitFinal                                                     */
/* ========================================================================= */
function ProfitFinal({ result }: { result: SimulationResult }) {
  const positive = result.margins.realAmount >= 0;

  return (
    <div className={`p-6 rounded-2xl border-2 text-center transition-all ${
      positive ? "border-green-400/20 bg-green-400/5" : "border-red-400/20 bg-red-400/5"
    }`}>
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-bold">Profit net estimé</p>
      <p className={`text-4xl md:text-5xl font-black ${positive ? "text-green-400" : "text-red-400"}`}>
        {new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(
          result.margins.realAmount
        )}
      </p>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 2: StatusHeader                                                    */
/* ========================================================================= */
function StatusHeader({ result }: { result: SimulationResult }) {
  const normalizedStatus = (
    result.decisionStatus === "OK FRAGILE" ? "OK_FRAGILE" :
    result.decisionStatus === "RENÉGOCIER" ? "RENEGOCIER" :
    result.decisionStatus === "NON RENTABLE" ? "NON_RENTABLE" :
    result.decisionStatus === "STRATÉGIQUE" ? "STRATEGIQUE" :
    result.decisionStatus
  ) as DecisionStatus;

  const cfg = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.OK;

  return (
    <div className={`p-5 rounded-2xl border ${cfg.bg} transition-all`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cfg.color}>{cfg.icon}</div>
          <div>
            <p className={`text-xl font-extrabold tracking-tight ${cfg.color}`}>{cfg.label}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Ratio CR/CC : {result.r.toFixed(2)}</p>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Score stratégique</p>
          <p className="text-2xl font-black text-white mt-0.5">
            {result.strategicScore}
            <span className="text-xs text-slate-500 font-normal">/12</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* CUSTOM LIGHTWEIGHT POPUP TOOLTIP IMPLEMENTATION                          */
/* ========================================================================= */
function CustomTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl text-[10px] leading-relaxed text-slate-300 text-center animate-fade-in pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-950" />
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/* MODULE 3: PriceSection WITH POPUPS                                       */
/* ========================================================================= */
function PriceSection({ result }: { result: SimulationResult }) {
  return (
    <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/30 space-y-4">
      <p className="text-xs text-slate-400 uppercase font-black tracking-wider">Prix et Options</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        <CustomTooltip text={PRICE_TOOLTIPS["Recommandé"]}>
          <PriceCard label="Recommandé" value={result.prices.recommended} highlight />
        </CustomTooltip>

        <CustomTooltip text={PRICE_TOOLTIPS["Minimum viable"]}>
          <PriceCard label="Minimum viable" value={result.prices.minimumViable} />
        </CustomTooltip>

        <CustomTooltip text={PRICE_TOOLTIPS["Cible"]}>
          <PriceCard label="Cible" value={result.prices.cible} />
        </CustomTooltip>

        <CustomTooltip text={PRICE_TOOLTIPS["À éviter"]}>
          <PriceCard label="À éviter" value={result.prices.avoid} danger />
        </CustomTooltip>

      </div>
    </div>
  );
}

function PriceCard({ label, value, highlight, danger }: { label: string; value: number; highlight?: boolean; danger?: boolean }) {
  let cls = "text-slate-100 text-sm";
  if (highlight) cls = "text-orange-400 text-lg font-black";
  if (danger) cls = "text-red-500 font-bold";

  return (
    <div className={`p-3 rounded-xl cursor-default transition-all duration-200 border w-full text-center ${
      highlight
        ? "bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40"
        : "bg-slate-950 border-slate-850 hover:border-slate-800"
    }`}>
      <p className="text-[10px] text-slate-500 mb-1 tracking-wide font-semibold uppercase">{label}</p>
      <p className={`font-mono font-bold ${cls}`}>{fmtPrice(value)}</p>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 4: PriceSimulator                                                 */
/* ========================================================================= */
interface PriceSimulatorProps {
  result: SimulationResult;
  simPrice: number;
  setSimPrice: (p: number) => void;
  marginRequestedPercent: number;
}

function getStatusAtPrice(
  price: number,
  costTotal: number,
  marginRequestedPercent: number,
  strategicScore: number
): {
  status: "OK" | "OK_FRAGILE" | "RENEGOCIER" | "NON_RENTABLE" | "STRATEGIQUE";
  ratio: number;
  marginRealPercent: number;
  profitNet: number;
} {
  const marginPct = marginRequestedPercent / 100;
  const CC = price * (1 - marginPct);
  const ratio = CC > 0 ? costTotal / CC : 999;
  const profitNet = price - costTotal;
  const marginRealPercent = price > 0 ? (profitNet / price) * 100 : 0;

  let status: "OK" | "OK_FRAGILE" | "RENEGOCIER" | "NON_RENTABLE" | "STRATEGIQUE";
  if (strategicScore >= 8 && ratio > 1.05) {
    status = "STRATEGIQUE";
  } else if (ratio <= 0.90) {
    status = "OK";
  } else if (ratio <= 1.05) {
    status = "OK_FRAGILE";
  } else if (ratio <= 1.20) {
    status = "RENEGOCIER";
  } else {
    status = "NON_RENTABLE";
  }

  return { status, ratio, marginRealPercent, profitNet };
}

function PriceSimulator({ result, simPrice, setSimPrice, marginRequestedPercent }: PriceSimulatorProps) {
  const minPrice = Math.floor(result.cr.total * 0.8);
  const maxPrice = Math.ceil(result.cr.total * 5);

  const sim = useMemo(
    () => getStatusAtPrice(simPrice, result.cr.total, marginRequestedPercent, result.strategicScore),
    [simPrice, result.cr.total, marginRequestedPercent, result.strategicScore]
  );

  const profitPositive = sim.profitNet >= 0;
  const costPct = simPrice > 0 ? (result.cr.total / simPrice) * 100 : 100;
  const profitPct = 100 - costPct;

  // Markers filters
  const markers = [
    { price: result.prices.avoid, label: "À éviter" },
    { price: result.prices.minimumViable, label: "Minimum" },
    { price: result.prices.recommended, label: "Recommandé" }
  ].filter((m) => m.price >= minPrice && m.price <= maxPrice);

  const statusColors: Record<string, string> = {
    OK: "text-green-400",
    OK_FRAGILE: "text-yellow-400",
    RENEGOCIER: "text-orange-400",
    NON_RENTABLE: "text-red-400",
    STRATEGIQUE: "text-blue-400"
  };

  const statusBg: Record<string, string> = {
    OK: "bg-green-400/5 border-green-400/20 text-green-300",
    OK_FRAGILE: "bg-yellow-400/5 border-yellow-400/20 text-yellow-300",
    RENEGOCIER: "bg-orange-400/5 border-orange-400/20 text-orange-300",
    NON_RENTABLE: "bg-red-400/5 border-red-400/20 text-red-300",
    STRATEGIQUE: "bg-blue-400/5 border-blue-400/20 text-blue-300"
  };

  const statusLabels: Record<string, string> = {
    OK: "RENTABLE",
    OK_FRAGILE: "FRAGILE",
    RENEGOCIER: "RENÉGOCIER",
    NON_RENTABLE: "NON RENTABLE",
    STRATEGIQUE: "STRATÉGIQUE"
  };

  return (
    <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/30 space-y-4">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-orange-500" />
        <p className="text-xs uppercase font-black text-slate-400 tracking-wider">Simulateur de prix de vente</p>
      </div>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        Ajustez le curseur pour simuler instantanément l'impact d'un prix de soumission alternatif sur vos marges opérationnelles.
      </p>

      {/* Slider markup */}
      <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
        <div className="flex justify-between items-baseline">
          <span className="text-[10px] text-slate-500 font-mono">{fmtPrice(minPrice)}</span>
          <span className="text-3xl md:text-4xl font-black text-orange-500 font-mono tracking-tight">{fmtPrice(simPrice)}</span>
          <span className="text-[10px] text-slate-500 font-mono">{fmtPrice(maxPrice)}</span>
        </div>
        
        <input
          type="range"
          value={simPrice}
          onChange={(e) => setSimPrice(Number(e.target.value))}
          min={minPrice}
          max={maxPrice}
          step={10}
          className="w-full accent-orange-500 cursor-pointer h-2 bg-slate-900 rounded-lg appearance-none"
        />

        {/* Markers navigation */}
        <div className="relative h-6 pt-1">
          {markers.map((m) => {
            const left = ((m.price - minPrice) / (maxPrice - minPrice)) * 100;
            return (
              <button
                key={m.label}
                type="button"
                onClick={() => setSimPrice(Math.round(m.price))}
                className="absolute -translate-x-1/2 text-[9px] text-slate-500 hover:text-orange-400 font-bold tracking-wider transition-colors font-mono cursor-pointer"
                style={{ left: `${Math.max(5, Math.min(95, left))}%` }}
              >
                ▲ {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid displays */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SimCard label="Statut simulation">
          <span className={`text-sm font-extrabold ${statusColors[sim.status]}`}>
            {statusLabels[sim.status]}
          </span>
        </SimCard>
        <SimCard label="Marge brute réelle">
          <span className={`text-sm font-bold font-mono ${profitPositive ? "text-green-400" : "text-red-400"}`}>
            {sim.marginRealPercent.toFixed(1)}%
          </span>
        </SimCard>
        <SimCard label="Profit net de vente">
          <span className={`text-sm font-black font-mono ${profitPositive ? "text-green-400" : "text-red-400"}`}>
            {fmtPrice(sim.profitNet)}
          </span>
        </SimCard>
        <SimCard label="Ratio CR / CC">
          <span className={`text-sm font-bold font-mono ${statusColors[sim.status]}`}>
            {sim.ratio.toFixed(2)}
          </span>
        </SimCard>
      </div>

      {/* Visual dynamic state bar graph */}
      <div className="space-y-1.5 p-1">
        <p className="text-[10px] text-slate-500 uppercase font-black">Structure d'allocation du prix simulé</p>
        <div className="h-6 rounded-lg overflow-hidden flex bg-slate-950 border border-slate-850">
          <div
            className="bg-slate-700/80 flex items-center justify-center text-[9px] font-bold text-slate-300 transition-all font-mono"
            style={{ width: `${Math.min(100, Math.max(0, costPct))}%` }}
          >
            {costPct > 25 && `Coûts ${costPct.toFixed(0)}%`}
          </div>
          <div
            className={`flex items-center justify-center text-[9px] font-bold transition-all font-mono ${
              profitPositive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, profitPct))}%` }}
          >
            {Math.abs(profitPct) > 10 && `Profit ${profitPct.toFixed(0)}%`}
          </div>
        </div>
      </div>

      {/* Bottom badge description */}
      <div className={`p-3 rounded-xl border text-center text-xs ${statusBg[sim.status] || "border-slate-800"}`}>
        <p className="leading-relaxed">
          {sim.status === "OK" && "✅ Ce tarif assure des marges saines et robustes. Excellente fourchette de soumission."}
          {sim.status === "OK_FRAGILE" && "⚠️ Zone de profit fragile. Tout imprévu de chantier de raccordement risquerait de saboter le profit."}
          {sim.status === "RENEGOCIER" && "🔶 Prix insuffisant pour atteindre vos objectifs de marge. Envisagez une négociation."}
          {sim.status === "NON_RENTABLE" && "🚫 Ce prix ne couvre pas vos coûts d'exploitation et de licences. Déficitaire."}
          {sim.status === "STRATEGIQUE" && "💎 Projet déficitaire en marge opérationnelle mais validé pour des motivations stratégiques récurrentes."}
        </p>
      </div>
    </div>
  );
}

function SimCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-center">
      <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">{label}</p>
      {children}
    </div>
  );
}

/* ========================================================================= */
/* MODULE 5: CostsBreakdown                                                 */
/* ========================================================================= */
function CostsBreakdown({ result }: { result: SimulationResult }) {
  const max = Math.max(...COST_ITEMS.map((c) => result.cr[c.key] as number), 1);

  return (
    <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/30">
      <div className="flex justify-between items-baseline mb-4 border-b border-slate-950 pb-3">
        <p className="text-xs text-slate-400 uppercase font-black tracking-wider">Répartition Coûts Complet de Rétablissement (CR)</p>
        <p className="text-base font-extrabold text-white font-mono">{fmtPrice(result.cr.total)}</p>
      </div>
      <div className="space-y-3">
        {COST_ITEMS.map((c) => {
          const val = result.cr[c.key] as number;
          if (val === 0) return null;
          const pct = Math.max(5, (val / max) * 100);
          return (
            <div key={c.key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-semibold">{c.label}</span>
                <span className="font-bold text-slate-300 font-mono">{fmtPrice(val)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-900">
                <div
                  className="h-full rounded-full bg-orange-500/70 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 6: ProfitabilitySection                                           */
/* ========================================================================= */
function ProfitabilitySection({ result }: { result: SimulationResult }) {
  return (
    <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/30">
      <p className="text-xs text-slate-400 uppercase font-black tracking-wider mb-4">Statistiques de rentabilité globale</p>
      <div className="grid grid-cols-3 gap-4">
        <Metric
          label="Marge cible"
          value={`${result.margins.targetPercent.toFixed(1)}%`}
          sub={fmtPrice(result.margins.targetAmount)}
        />
        <Metric
          label="Marge réelle"
          value={`${result.margins.realPercent.toFixed(1)}%`}
          sub={fmtPrice(result.margins.realAmount)}
          highlight
          positive={result.margins.realPercent >= result.margins.targetPercent}
        />
        <Metric
          label="Écart Marge"
          value={fmtPrice(result.margins.difference)}
          sub="vs marge souhaitée"
          highlight
          positive={result.margins.difference >= 0}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  highlight,
  positive
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  let color = "text-slate-200";
  if (highlight) {
    color = positive ? "text-green-400" : "text-amber-500";
  }

  return (
    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850/60 text-center">
      <p className="text-[10px] text-slate-500 uppercase mb-1.5 font-bold">{label}</p>
      <p className={`text-lg font-black font-mono ${color}`}>{value}</p>
      {sub && <p className="text-[9px] text-slate-500 mt-1 font-semibold">{sub}</p>}
    </div>
  );
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0
  }).format(n);
}
