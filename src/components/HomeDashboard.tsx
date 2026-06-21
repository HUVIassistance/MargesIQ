/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Zap, Settings, Calculator, BarChart3 } from "lucide-react";
import { SimulationState, ModeType } from "../types";

interface HomeDashboardProps {
  pastSimulations: SimulationState[];
  onSelectSimulation: (id: string) => void;
  onNewSimulation: (mode: ModeType) => void;
  onDeleteSimulation: (id: string, e: React.MouseEvent) => void;
}

export default function HomeDashboard({
  onNewSimulation,
}: HomeDashboardProps) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 text-slate-100" id="home_dashboard">
      {/* Hero Welcome Unit */}
      <div className="text-center mb-10 mt-8 animate-fade-in space-y-3">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-medium border border-orange-500/20 font-mono tracking-widest uppercase mx-auto">
          <Calculator size={11} className="text-orange-500" />
          Moteur de décision
        </div>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-none">
          Marges <span className="text-orange-500">IQ</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
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

      <div className="text-center text-slate-500 text-xs font-mono max-w-md mx-auto leading-relaxed border-t border-slate-900 pt-6">
        Sélectionnez l'un des trois modes ci-dessus pour bâtir votre simulation économique indépendante et confidentielle.
      </div>
    </div>
  );
}
