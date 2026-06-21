/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ModeType = "quick" | "standard" | "pro";

export type TradeType =
  | "Nettoyage"
  | "Entretien"
  | "Paysagement"
  | "HVAC"
  | "Plomberie"
  | "Électricité"
  | "Rénovation"
  | "Toiture"
  | "Peinture"
  | "Excavation"
  | "Béton";

export type OperationalProfileType =
  | "Service simple"
  | "Installation"
  | "Construction / Rénovation"
  | "Travaux lourds";

export type SubmissionObjectiveType =
  | "Maximiser le profit"
  | "Maximiser les chances de gagner"
  | "Remplir la capacité"
  | "Gagner un nouveau client"
  | "Projet stratégique";

export type ComplexityType = "Standard" | "Élevé" | "Extrême";

export type UnitType = "pi²" | "m³" | "unité" | "intervention" | "heure machine" | "projet global";

export interface MeasurementInput {
  tradeType: TradeType;
  operationalProfile: OperationalProfileType;
  objective: SubmissionObjectiveType;
  complexity: ComplexityType;
  unit: UnitType;
  quantity: number;
}

export type LevelType = "Faible" | "Moyen" | "Élevé";

export interface LaborInput {
  employees: number;
  days: number;
  hoursPerDay: number;
  hourlyRate: number;
}

export interface MaterialCostDetail {
  id: string;
  name: string;
  cost: number;
  quantity?: number;
  unitPrice?: number;
}

export interface SubcontractorDetail {
  id: string;
  name: string;
  cost: number;
}

export interface DirectCostsInput {
  labor: LaborInput;
  laborRoles?: LaborRoleInput[];
  materialsEstimation: number; // For Quick mode
  materialsDetailed: MaterialCostDetail[]; // For Standard/Pro
  subcontractors: SubcontractorDetail[]; // For Standard/Pro
  equipments: number;
}

export interface TransactionalCostsInput {
  travelLevel: LevelType; // Quick mode
  travelDistanceKm: number; // Standard/Pro
  travelRatePerKm: number; // Standard/Pro
  travelFrequency: number; // Standard/Pro
  permisDetailed: number; // Standard/Pro
  conformityAccess: number; // Standard/Pro
}

export interface BusinessCostsInput {
  cacLevel: LevelType; // Quick mode
  cacRealMarketing: number; // Pro mode
  cacConversionRate: number; // Pro mode (e.g. %)
  overheadMonthly: number;
  overheadLaborAllocationPercent: number; // allocates part of overhead to this project
  overheadDetailed?: OverheadLineInput[];
}

export interface ResilienceInput {
  bufferPercent: number;
}

export interface StrategicScoreInput {
  clientValue: number;         // 0-3
  portfolioEffect: number;     // 0-3
  acquisitionFuture: number;   // 0-3
  operationalAlignment: number;// 0-3
}

export interface MarginInput {
  type: "percent" | "amount";
  targetValue: number; // target margin: % or $
  proposedPrice?: number; // optional pre-entered price to compare
}

export interface LaborRoleInput {
  role: string;
  count: number;
  days: number;
  hoursPerDay: number;
  hourlyRate: number;
}

export interface OverheadLineInput {
  label: string;
  amount: number;
}

export interface ProCapacityInput {
  currentCapacityPercent: number;
  clientSegment: "Régulier" | "Nouveau d'or" | "Opportuniste" | "Partenariat";
  activeProjects?: number;
  maxProjects?: number;
  lifetimeValue?: number;
  isRecurring?: boolean;
}

// Full Simulation Input State
export interface SimulationState {
  id: string;
  projectName: string;
  mode: ModeType;
  createdAt: string;
  measurement: MeasurementInput;
  directCosts: DirectCostsInput;
  transactionalCosts: TransactionalCostsInput;
  businessCosts: BusinessCostsInput;
  resilience: ResilienceInput;
  margin: MarginInput;
  strategicScore: StrategicScoreInput;
  proCapacity?: ProCapacityInput;
  actuals?: {
    coûtRéelFinal: number;
    duréeRéelleJours: number;
    profitRéel: number;
    done: boolean;
  };
}

// Calculation output structure
export interface SimulationResult {
  cr: {
    total: number;
    labor: number;
    materials: number;
    subcontractors: number;
    equipments: number;
    travel: number;
    permis: number;
    cac: number;
    overhead: number;
    buffer: number;
  };
  cc: number; // Cost target
  r: number; // Ratio CR/CC
  decisionStatus: "OK" | "OK FRAGILE" | "RENÉGOCIER" | "NON RENTABLE" | "STRATÉGIQUE";
  strategicScore: number;
  strategicLevel: "Faible" | "Moyen" | "Élevé";
  prices: {
    minimumViable: number;
    cible: number;
    recommended: number;
    avoid: number;
  };
  margins: {
    targetPercent: number;
    targetAmount: number;
    realPercent: number;
    realAmount: number;
    difference: number;
  };
}
