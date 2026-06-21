/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { SimulationState, SimulationResult } from "../types";
import { calculateSimulation } from "../utils/pricingEngine";

interface PrintPDFProps {
  simulation: SimulationState;
  isPreview?: boolean;
}

export default function PrintPDF({ simulation, isPreview = false }: PrintPDFProps) {
  const result = calculateSimulation(simulation);
  const formattedDate = new Date().toLocaleDateString("fr-FR", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={
        isPreview
          ? "bg-white text-slate-900 p-6 md:p-12 font-sans w-full max-w-[800px] my-4 mx-auto rounded-2xl shadow-2xl overflow-y-auto"
          : "hidden print:block fixed inset-0 bg-white text-slate-900 p-12 overflow-y-auto z-[9999] font-sans"
      }
      id={isPreview ? undefined : "printable_pdf_view"}
    >
      {/* Document Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            RAPPORT ANALYTIQUE DE SOUMISSION
          </h1>
          <p className="text-xs font-mono text-slate-500 uppercase mt-1">
            GÉNÉRÉ LE {formattedDate} VIA MARGES IQ
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block bg-slate-900 text-white font-mono text-xs font-bold px-3 py-1 rounded">
            MODE {simulation.mode.toUpperCase()}
          </span>
          <p className="text-xs font-semibold text-slate-600 mt-1">PROMOTIONNEL & CONFIDENTIEL</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Project Metadata */}
        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase text-slate-800 border-b border-slate-300 pb-1">
            Informations du projet
          </h3>
          <div className="grid grid-cols-2 text-xs gap-x-4 gap-y-2">
            <span className="font-semibold text-slate-500">Nom :</span>
            <span className="font-bold text-slate-900">{simulation.projectName || "Projet sans nom"}</span>

            <span className="font-semibold text-slate-500">Métier :</span>
            <span className="font-bold text-slate-900">{simulation.measurement.tradeType}</span>

            <span className="font-semibold text-slate-500">Taille :</span>
            <span className="font-bold text-slate-900">
              {simulation.measurement.quantity} {simulation.measurement.unit}
            </span>

            <span className="font-semibold text-slate-500">Complexité :</span>
            <span className="font-bold text-slate-900">{simulation.measurement.complexity}</span>
          </div>
        </div>

        {/* Verdict Badge */}
        <div className="bg-slate-100 p-5 rounded-xl border border-slate-300 flex flex-col justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Decision Estimé</span>
            <span className="text-2xl font-black text-slate-950 mt-1 block tracking-wider">
              {result.decisionStatus}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 italic mt-2 leading-relaxed">
            "Recommandation issue du profil analytique d'installation {simulation.measurement.tradeType}."
          </p>
        </div>
      </div>

      {/* Target and recommended Pricing details */}
      <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-xl">
        <h3 className="text-xs font-black uppercase text-slate-800 mb-4 tracking-wider">
          Grille tarifaire et marges conseillées
        </h3>

        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="p-3 border border-slate-300 rounded bg-white">
            <span className="block text-[9px] uppercase font-bold text-slate-500">Tarif Recommandé</span>
            <span className="text-xl font-black text-slate-900 block mt-1">
              {result.prices.recommended.toLocaleString("fr-FR")} $
            </span>
          </div>

          <div className="p-3 border border-slate-300 rounded bg-white">
            <span className="block text-[9px] uppercase font-bold text-slate-500">Tarif exact cible</span>
            <span className="text-xl font-extrabold text-slate-800 block mt-1">
              {result.prices.cible.toLocaleString("fr-FR")} $
            </span>
          </div>

          <div className="p-3 border border-slate-300 rounded bg-white">
            <span className="block text-[9px] uppercase font-bold text-slate-500">Seuil de rentabilité</span>
            <span className="text-xl font-bold text-emerald-700 block mt-1">
              {result.prices.minimumViable.toLocaleString("fr-FR")} $
            </span>
          </div>

          <div className="p-3 border border-red-300 rounded bg-red-50 text-red-900">
            <span className="block text-[9px] uppercase font-bold text-red-700">Seuil à éviter</span>
            <span className="text-xl font-bold block mt-1">
              {result.prices.avoid.toLocaleString("fr-FR")} $
            </span>
          </div>
        </div>
      </div>

      {/* Structural Cost detail */}
      <div className="mb-8">
        <h3 className="text-sm font-black uppercase text-slate-800 border-b border-slate-300 pb-1 mb-4">
          Décomposition des coûts réels complets (CR)
        </h3>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-200 border-b-2 border-slate-400">
              <th className="py-2.5 px-3 font-bold text-slate-700">Composante de coût</th>
              <th className="py-2.5 px-3 text-right font-bold text-slate-700">Montant ($)</th>
              <th className="py-2.5 px-3 text-right font-bold text-slate-700">Quote-part (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="py-2 px-3 font-semibold text-slate-800">🔨 Main d'œuvre directe (Catégorie A)</td>
              <td className="py-2 px-3 text-right font-mono font-bold">{result.cr.labor.toLocaleString("fr-FR")} $</td>
              <td className="py-2 px-3 text-right font-mono">{Math.round((result.cr.labor / result.cr.total) * 100)} %</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-semibold text-slate-800">📦 Matériaux & Raccordements (Catégorie A)</td>
              <td className="py-2 px-3 text-right font-mono font-bold">{result.cr.materials.toLocaleString("fr-FR")} $</td>
              <td className="py-2 px-3 text-right font-mono">{Math.round((result.cr.materials / result.cr.total) * 100)} %</td>
            </tr>
            {(result.cr.subcontractors > 0 || result.cr.equipments > 0) && (
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-800">🤝 Sous-traitants & Équipements (Catégorie A)</td>
                <td className="py-2 px-3 text-right font-mono font-bold">
                  {(result.cr.subcontractors + result.cr.equipments).toLocaleString("fr-FR")} $
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {Math.round(((result.cr.subcontractors + result.cr.equipments) / result.cr.total) * 100)} %
                </td>
              </tr>
            )}
            <tr>
              <td className="py-2 px-3 font-semibold text-slate-800">🚚 Déplacement & Licences réglementaires (Catégorie B)</td>
              <td className="py-2 px-3 text-right font-mono font-bold">
                {(result.cr.travel + result.cr.permis).toLocaleString("fr-FR")} $
              </td>
              <td className="py-2 px-3 text-right font-mono">
                {Math.round(((result.cr.travel + result.cr.permis) / result.cr.total) * 100)} %
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-semibold text-slate-800">🏢 Overhead de structure & CAC (Catégorie C)</td>
              <td className="py-2 px-3 text-right font-mono font-bold">
                {(result.cr.overhead + result.cr.cac).toLocaleString("fr-FR")} $
              </td>
              <td className="py-2 px-3 text-right font-mono">
                {Math.round(((result.cr.overhead + result.cr.cac) / result.cr.total) * 100)} %
              </td>
            </tr>
            <tr className="bg-orange-50/50">
              <td className="py-2.5 px-3 font-bold text-orange-850">🛡️ Résilience / Réserve buffer de chantier ({simulation.resilience.bufferPercent}%)</td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-orange-850">{result.cr.buffer.toLocaleString("fr-FR")} $</td>
              <td className="py-2.5 px-3 text-right font-mono text-orange-850">{Math.round((result.cr.buffer / result.cr.total) * 100)} %</td>
            </tr>
            <tr className="bg-slate-100 hover:bg-slate-100 font-extrabold border-t-2 border-slate-400">
              <td className="py-3 px-3 uppercase text-slate-900">Coûts Complets Analystes (CR)</td>
              <td className="py-3 px-3 text-right font-mono text-base text-slate-950">
                {result.cr.total.toLocaleString("fr-FR")} $
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-900">100 %</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Strategic verification */}
      <div className="grid grid-cols-2 gap-8 mb-8 border-t border-slate-300 pt-6">
        <div>
          <h4 className="text-xs font-black uppercase text-slate-800 mb-2">Résultats de la Marge demandée</h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span>Marge cible initialement demandée :</span>
              <span className="font-bold text-slate-900">
                {simulation.margin.targetValue} {simulation.margin.type === "percent" ? "%" : "$"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Marge opérationnelle réelle projetée :</span>
              <span className="font-bold text-emerald-700">{result.margins.realPercent}%</span>
            </div>
            <div className="flex justify-between">
              <span>Profit net direct attendu :</span>
              <span className="font-bold text-slate-950">{result.margins.realAmount.toLocaleString("fr-FR")} $</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black uppercase text-slate-800 mb-2">Score Stratégique Global : {result.strategicScore}/12</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Ce score reflète l'opportunité de fidélisation de la clientèle (LTV : {simulation.strategicScore.clientValue}), prestige de référence ou opportunités d'acquisitions de sillage. Un score supérieur à 8 justifie la validation de chantiers à marge resserrée.
          </p>
        </div>
      </div>

      <div className="text-center text-[10px] text-slate-400 border-t border-slate-200 pt-6 mt-12">
        Ce document financier est à but analytique uniquement. La décision finale incombe à la gérance agréée du bénéficiaire.
      </div>
    </div>
  );
}
