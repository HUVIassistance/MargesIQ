/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Zap,
  Settings,
  Calculator,
  BarChart3,
  FolderOpen,
  Trash2,
  Clock,
  History,
  Plus,
} from "lucide-react";
import { SimulationState, ModeType } from "../types";
import { calculateSimulation } from "../utils/pricingEngine";
import HuviLogo from "./HuviLogo";

interface HomeDashboardProps {
  pastSimulations: SimulationState[];
  onSelectSimulation: (id: string) => void;
  onNewSimulation: (mode: ModeType) => void;
  onDeleteSimulation: (id: string, e: React.MouseEvent) => void;
}

const MODE_META: Record<
  ModeType,
  { label: string; badge: string; dot: string }
> = {
  quick: {
    label: "Quick",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/10",
    dot: "bg-amber-500",
  },
  standard: {
    label: "Standard",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/10",
    dot: "bg-blue-500",
  },
  pro: {
    label: "Pro",
    badge: "bg-purple-500/15 text-purple-400 border-purple-500/10",
    dot: "bg-purple-500",
  },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function getRealMargin(sim: SimulationState): number | null {
  try {
    return calculateSimulation(sim).margins.realPercent;
  } catch {
    return null;
  }
}

export default function HomeDashboard({
  pastSimulations,
  onSelectSimulation,
  onNewSimulation,
  onDeleteSimulation,
}: HomeDashboardProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 text-slate-100" id="home_dashboard">
      {/* Hero Welcome Unit */}
      <div className="text-center mb-10 mt-8 animate-fade-in space-y-3">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-medium border border-orange-500/20 font-mono tracking-widest uppercase mx-auto">
          <Calculator size={11} className="text-orange-500" />
          Moteur de décision
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="relative inline-block pb-5" id="home_title_wrapper">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-none">
              Marges <span className="text-orange-500">IQ</span>
            </h1>
            <div className="absolute -bottom-1 right-0 bg-slate-950/90 border border-slate-800/60 px-1.5 py-0.5 rounded-full text-slate-300 shadow-lg backdrop-blur-sm flex items-center gap-1 select-none" id="brand_badge">
              <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-widest pl-0.5">par</span>
              <HuviLogo showText={true} size="xs" layout="horizontal" />
            </div>
          </div>
        </div>
        <p className="text-xs md:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed pt-1">
          Ce n'est pas un estimateur. C'est un moteur de précalcul et de décision économique pour services terrain.
        </p>
      </div>

      {/* Modes Direct Actions Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
        {/* Quick Card */}
        <button
          onClick={() => onNewSimulation("quick")}
          className="group text-left bg-[#111727]/60 hover:bg-[#151c30] border border-slate-800/80 hover:border-amber-500/50 p-6 rounded-3xl space-y-4 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-xl"
        >
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-all duration-300">
            <Zap size={20} fill="currentColor" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white group-hover:text-amber-400 transition-all duration-300 flex items-center justify-between">
              Quick
              <span className="text-[10px] bg-amber-500/15 text-amber-400 font-mono py-0.5 px-2 rounded-full border border-amber-500/10">&lt; 60s</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Estimations simplifiées, vitesse maximale</p>
            <p className="text-[11px] text-slate-500 mt-4 border-t border-slate-800/50 pt-3 leading-relaxed">
              Matériel estimé globalement, coûts de déplacement et frais d'administration forfaitaires. Parfait pour un premier précalcul rapide.
            </p>
          </div>
        </button>

        {/* Standard Card */}
        <button
          onClick={() => onNewSimulation("standard")}
          className="group text-left bg-[#111727]/60 hover:bg-[#151c30] border border-slate-800/80 hover:border-blue-500/50 p-6 rounded-3xl space-y-4 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-xl"
        >
          <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-slate-950 transition-all duration-300">
            <Settings size={20} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-all duration-300 flex items-center justify-between">
              Standard
              <span className="text-[10px] bg-blue-500/15 text-blue-400 font-mono py-0.5 px-2 rounded-full border border-blue-500/10">Recommandé</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Précision opérationnelle fine</p>
            <p className="text-[11px] text-slate-500 mt-4 border-t border-slate-800/50 pt-3 leading-relaxed">
              Prise en compte détaillée des matériaux réels, sous-traitance, permis municipaux et kilométrage logistique simulé du parcours.
            </p>
          </div>
        </button>

        {/* Pro Card */}
        <button
          onClick={() => onNewSimulation("pro")}
          className="group text-left bg-[#111727]/60 hover:bg-[#151c30] border border-slate-800/80 hover:border-purple-500/50 p-6 rounded-3xl space-y-4 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/40 shadow-xl"
        >
          <div className="h-10 w-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-slate-950 transition-all duration-300">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white group-hover:text-purple-400 transition-all duration-300 flex items-center justify-between">
              Pro
              <span className="text-[10px] bg-purple-500/15 text-purple-400 font-mono py-0.5 px-2 rounded-full border border-purple-500/10">Complet</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Rentabilité stratégique globale</p>
            <p className="text-[11px] text-slate-500 mt-4 border-t border-slate-800/50 pt-3 leading-relaxed">
              Ajoute le coût d'acquisition client (CAC), l'amortissement des frais fixes d'opération (Overhead) et l'alignement des objectifs d'affaires.
            </p>
          </div>
        </button>
      </div>

      {/* Saved Simulations History */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <History size={14} />
            Simulations enregistrées
          </h2>
          {pastSimulations.length > 0 && (
            <span className="text-[11px] font-mono text-slate-500">
              {pastSimulations.length} sur cet appareil
            </span>
          )}
        </div>

        {pastSimulations.length === 0 ? (
          <div className="bg-[#111727]/40 border border-dashed border-slate-800 rounded-3xl p-8 text-center space-y-3">
            <p className="text-sm font-bold text-slate-300">
              Aucune simulation enregistrée sur cet appareil
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Vos simulations sauvegardées restent sur cet appareil (localStorage).
              Créez votre première simulation pour la retrouver ici.
            </p>
            <button
              onClick={() => onNewSimulation("standard")}
              className="inline-flex items-center gap-1.5 mt-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            >
              <Plus size={14} />
              Créer une simulation
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {pastSimulations.map((sim) => {
              const realMargin = getRealMargin(sim);
              const meta = MODE_META[sim.mode] || MODE_META.quick;
              const isConfirming = confirmingId === sim.id;

              return (
                <li key={sim.id}>
                  <div className="bg-[#111727]/60 hover:bg-[#151c30] border border-slate-800/80 hover:border-orange-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all duration-300">
                    {/* Rouvrir : clickable info block */}
                    <button
                      onClick={() => onSelectSimulation(sim.id)}
                      title="Rouvrir cette simulation"
                      className="flex-1 text-left min-w-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/40 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} shrink-0`} />
                        <span className="font-bold text-white truncate">
                          {sim.projectName || "Simulation sans nom"}
                        </span>
                        <span
                          className={`text-[10px] font-mono py-0.5 px-2 rounded-full border ${meta.badge} shrink-0`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(sim.createdAt)}
                        </span>
                        <span className="truncate">
                          {sim.measurement.tradeType} · {sim.measurement.quantity} {sim.measurement.unit}
                        </span>
                      </div>
                    </button>

                    {/* Marge calculée */}
                    {realMargin !== null && (
                      <div className="sm:text-right shrink-0">
                        <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                          Marge réelle
                        </span>
                        <span
                          className={`text-sm font-black font-mono ${
                            realMargin >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {realMargin.toFixed(1)} %
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onSelectSimulation(sim.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                      >
                        <FolderOpen size={13} />
                        Rouvrir
                      </button>

                      {isConfirming ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              onDeleteSimulation(sim.id, e);
                              setConfirmingId(null);
                            }}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmingId(sim.id)}
                          aria-label={`Supprimer ${sim.projectName || "cette simulation"}`}
                          title="Supprimer"
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="text-center text-slate-500 text-xs font-mono max-w-md mx-auto leading-relaxed border-t border-slate-900 pt-6">
        Sélectionnez l'un des trois modes ci-dessus pour bâtir votre simulation économique indépendante et confidentielle.
      </div>
    </div>
  );
}
