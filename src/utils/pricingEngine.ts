/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SimulationState, SimulationResult, TradeType, OperationalProfileType } from "../types";
import { SubmissionInput, TradeType as LibTrade, MeasureUnit, Complexity, Objective, Level, LaborRole, MaterialLine, OverheadLine, ClientSegment, CalculationResult } from "../lib/types";
import { calculate } from "../lib/calculations";

export const TRADE_PROFILES: Record<
  TradeType,
  { profile: OperationalProfileType; defaultBuffer: number; tips: string }
> = {
  Nettoyage: {
    profile: "Service simple",
    defaultBuffer: 10,
    tips: "Projet simple. Attention à ne pas sous-évaluer le temps de déplacement.",
  },
  Entretien: {
    profile: "Service simple",
    defaultBuffer: 10,
    tips: "Projet régulier. Veillez à inclure le coût complet du transport et du petit matériel.",
  },
  Paysagement: {
    profile: "Service simple",
    defaultBuffer: 12,
    tips: "Frais de déplacement et météo variables. Conservez un buffer de sécurité minimal.",
  },
  HVAC: {
    profile: "Installation",
    defaultBuffer: 15,
    tips: "Risque modéré lié à la complexité des raccordements ou à la conformité.",
  },
  Plomberie: {
    profile: "Installation",
    defaultBuffer: 15,
    tips: "Risque de fuite ou de pièces non standards. Surveillez les permis d'intervention.",
  },
  Électricité: {
    profile: "Installation",
    defaultBuffer: 15,
    tips: "Normes électriques strictes. Assurez-vous d'avoir pris en compte tous les accessoires de sécurité.",
  },
  Rénovation: {
    profile: "Construction / Rénovation",
    defaultBuffer: 18,
    tips: "Risque élevé d'imprévus de chantier (murs creux usés, accès difficile).",
  },
  Toiture: {
    profile: "Construction / Rénovation",
    defaultBuffer: 20,
    tips: "Dépendance météo majeure et risques de hauteur importants. Buffer renforcé.",
  },
  Peinture: {
    profile: "Construction / Rénovation",
    defaultBuffer: 15,
    tips: "La préparation des supports prend souvent plus de temps que prévu. Ne la sous-estimez pas.",
  },
  Excavation: {
    profile: "Travaux lourds",
    defaultBuffer: 25,
    tips: "Risque extrême. Météo, bris d'équipements, ou conditions de sol imprévues.",
  },
  Béton: {
    profile: "Travaux lourds",
    defaultBuffer: 22,
    tips: "Le temps de prise et de livraison du béton est critique. Les pénalités de retard grimpent vite.",
  },
};

export function getProfileForTrade(trade: TradeType): {
  profile: OperationalProfileType;
  defaultBuffer: number;
  tips: string;
} {
  return TRADE_PROFILES[trade] || {
    profile: "Service simple",
    defaultBuffer: 10,
    tips: "Ajustez vos paramètres selon la réalité du terrain.",
  };
}

export function mapStateToSubmissionInput(state: SimulationState): SubmissionInput {
  // Trade mapping
  const tradeMap: Record<TradeType, LibTrade> = {
    "Nettoyage": "nettoyage",
    "Entretien": "entretien",
    "Paysagement": "paysagement",
    "HVAC": "hvac",
    "Plomberie": "plomberie",
    "Électricité": "electricite",
    "Rénovation": "renovation",
    "Toiture": "toiture",
    "Peinture": "peinture",
    "Excavation": "excavation",
    "Béton": "beton"
  };
  const trade = tradeMap[state.measurement.tradeType] || "renovation";

  // Objective mapping
  const objMap: Record<string, Objective> = {
    "Maximiser le profit": "maximiser_profit",
    "Maximiser les chances de gagner": "maximiser_chances",
    "Remplir la capacité": "remplir_capacite",
    "Entrer un nouveau client": "nouveau_client",
    "Projet stratégique": "strategique"
  };
  const objective = objMap[state.measurement.objective] || "maximiser_profit";

  // Unit mapping
  const unitMap: Record<string, MeasureUnit> = {
    "pi²": "pi2",
    "m³": "m3",
    "unité": "unite",
    "intervention": "intervention",
    "heure machine": "heure_machine",
    "projet global": "forfait"
  };
  const unit = unitMap[state.measurement.unit] || "pi2";

  // Complexity mapping
  const compMap: Record<string, Complexity> = {
    "Standard": "standard",
    "Élevé": "eleve",
    "Extrême": "extreme"
  };
  const complexity = compMap[state.measurement.complexity] || "standard";

  // Level mapping
  const levelMap: Record<string, Level> = {
    "Faible": "faible",
    "Moyen": "moyen",
    "Élevé": "eleve"
  };
  const travelLevel = levelMap[state.transactionalCosts.travelLevel] || "moyen";
  const cacLevel = levelMap[state.businessCosts.cacLevel] || "moyen";

  // Labor roles mapping
  const laborRoles: LaborRole[] = (state.directCosts.laborRoles || []).map(r => ({
    role: r.role || "Journalier",
    count: r.count || 0,
    hourlyRate: r.hourlyRate || 0,
    hoursPerDay: r.hoursPerDay || 0,
    days: r.days || 0
  }));

  // Materials detailed mapping
  const materialsDetailed: MaterialLine[] = (state.directCosts.materialsDetailed || []).map(m => ({
    description: m.name || "Matériel",
    quantity: m.quantity || 1,
    unitPrice: m.unitPrice !== undefined ? m.unitPrice : (m.cost || 0)
  }));

  // Subcontractors detailed mapping
  const subcontractors = (state.directCosts.subcontractors || []).reduce((sum, s) => sum + (s.cost || 0), 0);
  const equipment = state.directCosts.equipments || 0;

  // Overhead Detailed
  const overheadDetailed: OverheadLine[] = (state.businessCosts.overheadDetailed || []).map(o => ({
    label: o.label || "Overhead",
    amount: o.amount || 0
  }));

  // Overhead calculation mapping
  const overhead = state.mode === "standard"
    ? Math.round((state.directCosts.labor.employees * state.directCosts.labor.days * state.directCosts.labor.hoursPerDay * state.directCosts.labor.hourlyRate) * (state.businessCosts.overheadLaborAllocationPercent / 100 || 0.15))
    : (state.businessCosts.overheadMonthly || 0);

  // Client values
  const segmentMap: Record<string, ClientSegment> = {
    "Régulier": "commercial",
    "Nouveau d'or": "residentiel",
    "Opportuniste": "residentiel",
    "Partenariat": "institutionnel"
  };
  const clientSegment = state.proCapacity?.clientSegment ? (segmentMap[state.proCapacity.clientSegment] || "residentiel") : "residentiel";

  return {
    mode: state.mode,
    trade,
    objective,
    unit,
    quantity: state.measurement.quantity || 0,
    complexity,
    employees: state.directCosts.labor.employees || 0,
    days: state.directCosts.labor.days || 0,
    hoursPerDay: state.directCosts.labor.hoursPerDay || 0,
    hourlyRate: state.directCosts.labor.hourlyRate || 0,
    laborRoles,
    materialsGlobal: state.directCosts.materialsEstimation || 0,
    materialsDetailed,
    subcontractors,
    equipment,
    travelLevel,
    travelKm: state.transactionalCosts.travelDistanceKm || 0,
    travelFrequency: state.transactionalCosts.travelFrequency || 0,
    travelCostPerKm: state.transactionalCosts.travelRatePerKm || 0.65,
    permits: state.transactionalCosts.permisDetailed || 0,
    cacLevel,
    cacAmount: state.businessCosts.cacRealMarketing || 0,
    cacLeadsTotal: state.businessCosts.cacRealMarketing || 0,
    cacConversionRate: state.businessCosts.cacConversionRate || 20,
    cacCostPerLead: 10,
    overhead,
    overheadDetailed,
    bufferPercent: state.resilience.bufferPercent || 0,
    marginType: state.margin.type === "amount" ? "dollar" : "percent",
    marginValue: state.margin.targetValue || 20,
    targetPrice: state.margin.proposedPrice || 0,
    capacityCurrentPercent: state.proCapacity?.currentCapacityPercent || 70,
    capacityMaxProjects: state.proCapacity?.maxProjects || 10,
    capacityActiveProjects: state.proCapacity?.activeProjects || 7,
    clientSegment,
    clientIsRecurring: state.proCapacity?.isRecurring || false,
    clientLifetimeValue: state.proCapacity?.lifetimeValue || 0,
    strategicClientValue: state.strategicScore.clientValue || 0,
    strategicPortfolio: state.strategicScore.portfolioEffect || 0,
    strategicAcquisition: state.strategicScore.acquisitionFuture || 0,
    strategicAlignment: state.strategicScore.operationalAlignment || 0
  };
}

export function mapCalculationResultToSimulationResult(res: CalculationResult): SimulationResult {
  const statusMap: Record<string, "OK" | "OK FRAGILE" | "RENÉGOCIER" | "NON RENTABLE" | "STRATÉGIQUE"> = {
    "OK": "OK",
    "OK_FRAGILE": "OK FRAGILE",
    "RENEGOCIER": "RENÉGOCIER",
    "NON_RENTABLE": "NON RENTABLE",
    "STRATEGIQUE": "STRATÉGIQUE"
  };

  const decisionStatus = statusMap[res.status] || "OK";

  let strategicLevel: "Faible" | "Moyen" | "Élevé" = "Moyen";
  if (res.strategicScore <= 3) strategicLevel = "Faible";
  else if (res.strategicScore <= 7) strategicLevel = "Moyen";
  else strategicLevel = "Élevé";

  // CC (Target Cost) is ratio > 0 ? (costTotal / ratio) : costTotal
  const cc = res.ratio > 0 ? res.costTotal / res.ratio : res.costTotal;

  return {
    cr: {
      total: res.costTotal,
      labor: res.costLabor,
      materials: res.costMaterials,
      subcontractors: res.costSubcontractors,
      equipments: res.costEquipment,
      travel: res.costTravel,
      permis: res.costPermits,
      cac: res.costCac,
      overhead: res.costOverhead,
      buffer: res.costBuffer
    },
    cc,
    r: res.ratio,
    decisionStatus,
    strategicScore: res.strategicScore,
    strategicLevel,
    prices: {
      minimumViable: res.priceMinimum,
      cible: res.priceTarget,
      recommended: res.priceRecommended,
      avoid: res.priceAvoid
    },
    margins: {
      targetPercent: res.marginRequestedPercent,
      targetAmount: res.marginRequested,
      realPercent: res.marginRealPercent,
      realAmount: res.marginReal,
      difference: res.marginGap
    }
  };
}

export function calculateSimulation(state: SimulationState): SimulationResult {
  const input = mapStateToSubmissionInput(state);
  const result = calculate(input);
  return mapCalculationResultToSimulationResult(result);
}
