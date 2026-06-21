/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ModeType, SimulationState } from "./types";
import HomeDashboard from "./components/HomeDashboard";
import ProjectForm from "./components/ProjectForm";
import ResultScreen from "./components/ResultScreen";
import PrintPDF from "./components/PrintPDF";

// 3 Pre-populated realistic Field Service mock simulations as a professional SaaS starting state
const DEFAULT_SIMULATIONS: SimulationState[] = [
  {
    id: "sim-1",
    projectName: "Entretien Pavé Uni - Résidence Tremblay",
    mode: "quick",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    measurement: {
      tradeType: "Entretien",
      operationalProfile: "Service simple",
      objective: "Maximiser le profit",
      complexity: "Standard",
      unit: "pi²",
      quantity: 1200,
    },
    directCosts: {
      labor: {
        employees: 2,
        days: 2,
        hoursPerDay: 8,
        hourlyRate: 35,
      },
      materialsEstimation: 450,
      materialsDetailed: [],
      subcontractors: [],
      equipments: 120,
    },
    transactionalCosts: {
      travelLevel: "Moyen",
      travelDistanceKm: 0,
      travelRatePerKm: 0,
      travelFrequency: 0,
      permisDetailed: 0,
      conformityAccess: 0,
    },
    businessCosts: {
      cacLevel: "Faible",
      cacRealMarketing: 0,
      cacConversionRate: 0,
      overheadMonthly: 0,
      overheadLaborAllocationPercent: 0,
    },
    resilience: {
      bufferPercent: 10,
    },
    margin: {
      type: "percent",
      targetValue: 20,
      proposedPrice: 2850,
    },
    strategicScore: {
      clientValue: 1,
      portfolioEffect: 1,
      acquisitionFuture: 0,
      operationalAlignment: 3,
    },
    actuals: {
      coûtRéelFinal: 2150,
      duréeRéelleJours: 2,
      profitRéel: 700,
      done: true,
    },
  },
  {
    id: "sim-2",
    projectName: "Installation HVAC & Chauffage Centraux - Bureau ProDoc",
    mode: "standard",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    measurement: {
      tradeType: "HVAC",
      operationalProfile: "Installation",
      objective: "Maximiser les chances de gagner",
      complexity: "Élevé",
      unit: "unité",
      quantity: 2,
    },
    directCosts: {
      labor: {
        employees: 3,
        days: 3,
        hoursPerDay: 8,
        hourlyRate: 46,
      },
      materialsEstimation: 0,
      materialsDetailed: [
        { id: "m1", name: "Thermostats connectés Nest", cost: 380 },
        { id: "m2", name: "Chambre à vide & Tuyaux de raccord", cost: 1200 },
        { id: "m3", name: "Support compresseur extérieur", cost: 450 },
      ],
      subcontractors: [
        { id: "s1", name: "Électricien agréé (Raccordements)", cost: 750 },
      ],
      equipments: 350,
    },
    transactionalCosts: {
      travelLevel: "Moyen",
      travelDistanceKm: 45,
      travelRatePerKm: 0.65,
      travelFrequency: 3,
      permisDetailed: 150,
      conformityAccess: 80,
    },
    businessCosts: {
      cacLevel: "Moyen",
      cacRealMarketing: 0,
      cacConversionRate: 0,
      overheadMonthly: 0,
      overheadLaborAllocationPercent: 15,
    },
    resilience: {
      bufferPercent: 15,
    },
    margin: {
      type: "percent",
      targetValue: 25,
      proposedPrice: 11500,
    },
    strategicScore: {
      clientValue: 2,
      portfolioEffect: 2,
      acquisitionFuture: 1,
      operationalAlignment: 2,
    },
  },
  {
    id: "sim-3",
    projectName: "Coulage d'allée & Fondations lourdes - Club de Golf local",
    mode: "pro",
    createdAt: new Date().toISOString(),
    measurement: {
      tradeType: "Béton",
      operationalProfile: "Travaux lourds",
      objective: "Projet stratégique",
      complexity: "Extrême",
      unit: "m³",
      quantity: 18,
    },
    directCosts: {
      labor: {
        employees: 5,
        days: 4,
        hoursPerDay: 8,
        hourlyRate: 50,
      },
      materialsEstimation: 0,
      materialsDetailed: [
        { id: "m4", name: "Béton prémélangé 35Mpa", cost: 3600 },
        { id: "m5", name: "Armature acier renforcé", cost: 1850 },
      ],
      subcontractors: [],
      equipments: 1600, // Excavatice heavy rental
    },
    transactionalCosts: {
      travelLevel: "Moyen",
      travelDistanceKm: 60,
      travelRatePerKm: 0.7,
      travelFrequency: 4,
      permisDetailed: 450,
      conformityAccess: 200,
    },
    businessCosts: {
      cacLevel: "Élevé",
      cacRealMarketing: 350,
      cacConversionRate: 8, // 8% sales conversion
      overheadMonthly: 450,
      overheadLaborAllocationPercent: 0,
    },
    resilience: {
      bufferPercent: 22,
    },
    margin: {
      type: "amount",
      targetValue: 5000,
      proposedPrice: 22800,
    },
    strategicScore: {
      clientValue: 3,
      portfolioEffect: 3,
      acquisitionFuture: 3,
      operationalAlignment: 1,
    },
  },
];

export default function App() {
  const [pastSimulations, setPastSimulations] = useState<SimulationState[]>([]);
  const [viewState, setViewState] = useState<"dashboard" | "form" | "result">("dashboard");
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);
  const [editingState, setEditingState] = useState<SimulationState | null>(null);

  // Sync state changes in-memory for privacy (no multi-user data leaks)
  const saveToLocalStorage = (simulations: SimulationState[]) => {
    setPastSimulations(simulations);
  };

  const handleNewSimulation = (mode: ModeType) => {
    // Generate initial structured empty state with standard fields for chosen Mode
    const defaultTrade = "Nettoyage";
    const initialSim: SimulationState = {
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
      },
      directCosts: {
        labor: {
          employees: 1,
          days: 1,
          hoursPerDay: 8,
          hourlyRate: 30,
        },
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
      resilience: {
        bufferPercent: 10,
      },
      margin: {
        type: "percent",
        targetValue: 20,
      },
      strategicScore: {
        clientValue: 0,
        portfolioEffect: 0,
        acquisitionFuture: 0,
        operationalAlignment: 0,
      },
    };

    setEditingState(initialSim);
    setViewState("form");
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

  const currentActiveSim = selectedSimId
    ? pastSimulations.find((sim) => sim.id === selectedSimId)
    : editingState;

  return (
    <div className="min-h-screen bg-[#0d121f] text-slate-100 flex flex-col font-sans">
      {/* Visual Navigation Header */}
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

          <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            STABLE v1.0.0
          </div>
        </div>
      </header>

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
            onCancel={() => setViewState("dashboard")}
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

      {/* Client Proposal PDF printing layout overlay */}
      {currentActiveSim && <PrintPDF simulation={currentActiveSim} />}
    </div>
  );
}
