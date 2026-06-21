import type { SubmissionInput, CalculationResult, DecisionStatus, Level, Objective } from './types';
import { TRADE_TO_PROFILE } from './types';

function levelToValue(level: Level, low: number, mid: number, high: number): number {
  if (level === 'faible') return low;
  if (level === 'moyen') return mid;
  return high;
}

function objectiveMarginAdjust(objective: Objective): number {
  switch (objective) {
    case 'maximiser_profit': return 1.0;
    case 'maximiser_chances': return 0.85;
    case 'remplir_capacite': return 0.75;
    case 'nouveau_client': return 0.80;
    case 'strategique': return 0.90;
  }
}

export function calculate(input: SubmissionInput): CalculationResult {
  const profile = TRADE_TO_PROFILE[input.trade];

  // Labor
  let costLabor: number;
  if (input.mode === 'pro' && input.laborRoles.length > 0) {
    costLabor = input.laborRoles.reduce((s, r) => s + r.count * r.days * r.hoursPerDay * r.hourlyRate, 0);
  } else {
    costLabor = input.employees * input.days * input.hoursPerDay * input.hourlyRate;
  }

  // Materials
  let costMaterials: number;
  if (input.mode === 'quick' || input.materialsDetailed.length === 0) {
    costMaterials = input.materialsGlobal;
  } else {
    costMaterials = input.materialsDetailed.reduce((s, m) => s + m.quantity * m.unitPrice, 0);
  }

  const costSubcontractors = input.subcontractors;
  const costEquipment = input.equipment;

  // Travel
  let costTravel: number;
  if (input.mode === 'quick') {
    costTravel = levelToValue(input.travelLevel, 50, 200, 500);
  } else {
    costTravel = input.travelKm * input.travelCostPerKm * input.travelFrequency * 2;
  }

  const costPermits = input.permits;

  // CAC
  let costCac: number;
  if (input.mode === 'quick') {
    costCac = levelToValue(input.cacLevel, 50, 200, 500);
  } else if (input.mode === 'pro' && input.cacLeadsTotal > 0 && input.cacConversionRate > 0) {
    // Pro: CAC = (total leads × cost per lead) / (leads × conversion rate)
    const totalCacSpend = input.cacLeadsTotal * input.cacCostPerLead;
    const wonProjects = input.cacLeadsTotal * (input.cacConversionRate / 100);
    costCac = wonProjects > 0 ? totalCacSpend / wonProjects : totalCacSpend;
  } else {
    costCac = input.cacAmount;
  }

  // Overhead
  let costOverhead: number;
  if (input.mode === 'quick') {
    costOverhead = (costLabor + costMaterials) * 0.15;
  } else if (input.mode === 'pro' && input.overheadDetailed.length > 0) {
    costOverhead = input.overheadDetailed.reduce((s, o) => s + o.amount, 0);
  } else {
    costOverhead = input.overhead;
  }

  // Production (direct)
  const costProduction = costLabor + costMaterials + costSubcontractors + costEquipment;

  // Pre-buffer total
  const preBuffer = costProduction + costTravel + costPermits + costCac + costOverhead;

  // Buffer
  const bufferPercent = input.bufferPercent / 100;
  
  // Profile-suggested buffer additions
  let profileBufferAdd = 0;
  if (profile === 'travaux_lourds') profileBufferAdd = 0.03;
  if (profile === 'construction') profileBufferAdd = 0.02;
  if (input.complexity === 'eleve') profileBufferAdd += 0.02;
  if (input.complexity === 'extreme') profileBufferAdd += 0.05;

  const effectiveBuffer = bufferPercent + profileBufferAdd;
  const costBuffer = preBuffer * effectiveBuffer;
  const costTotal = preBuffer + costBuffer; // CR

  // Strategic score
  const strategicScore =
    input.strategicClientValue +
    input.strategicPortfolio +
    input.strategicAcquisition +
    input.strategicAlignment;

  // Margin
  let marginRequestedPercent: number;
  let marginRequested: number;

  if (input.targetPrice > 0) {
    // User provided a target price — calculate margin from it
    if (input.marginType === 'percent') {
      marginRequestedPercent = input.marginValue / 100;
      marginRequested = input.targetPrice * marginRequestedPercent;
    } else {
      marginRequested = input.marginValue;
      marginRequestedPercent = input.targetPrice > 0 ? marginRequested / input.targetPrice : 0;
    }
  } else {
    marginRequestedPercent = input.marginType === 'percent' ? input.marginValue / 100 : 0.25;
    marginRequested = 0; // will compute from recommended price
  }

  // CC = target cost
  // If target price set: CC = targetPrice * (1 - margin%)
  // Else: we compute recommended price from CR and margin
  let priceTarget: number;
  let CC: number;

  if (input.targetPrice > 0) {
    priceTarget = input.targetPrice;
    CC = priceTarget * (1 - marginRequestedPercent);
  } else {
    // price = CR / (1 - margin%)
    priceTarget = marginRequestedPercent < 1 ? costTotal / (1 - marginRequestedPercent) : costTotal * 2;
    CC = costTotal;
  }

  // Ratio
  const ratio = CC > 0 ? costTotal / CC : 999;

  // Decision
  let status: DecisionStatus;
  if (strategicScore >= 8 && ratio > 1.05) {
    status = 'STRATEGIQUE';
  } else if (ratio <= 0.90) {
    status = 'OK';
  } else if (ratio <= 1.05) {
    status = 'OK_FRAGILE';
  } else if (ratio <= 1.20) {
    status = 'RENEGOCIER';
  } else {
    status = 'NON_RENTABLE';
  }

  // Price variants
  const adjust = objectiveMarginAdjust(input.objective);
  const priceRecommended = costTotal / (1 - marginRequestedPercent * adjust);
  const priceMinimum = costTotal * 1.05; // 5% above costs
  const priceAvoid = costTotal * 0.95; // below costs

  // Real margin (use targetPrice if set, otherwise priceRecommended)
  const priceForRealMargin = input.targetPrice > 0 ? input.targetPrice : priceRecommended;
  const marginReal = priceForRealMargin - costTotal;
  const marginRealPercent = priceForRealMargin > 0 ? marginReal / priceForRealMargin : 0;

  // If no target was set, recalculate requested margin based on recommended price
  if (input.targetPrice <= 0) {
    marginRequested = priceRecommended * marginRequestedPercent;
  }

  const marginGap = marginReal - marginRequested;
  const profitNet = priceForRealMargin - costTotal;

  // Insight
  const insight = generateInsight(input, costTotal, priceRecommended, ratio, status, profile);

  return {
    status,
    ratio,
    strategicScore,
    priceRecommended: round2(priceRecommended),
    priceMinimum: round2(priceMinimum),
    priceTarget: round2(priceTarget),
    priceAvoid: round2(priceAvoid),
    marginRequested: round2(marginRequested),
    marginRequestedPercent: round2(marginRequestedPercent * 100),
    marginReal: round2(marginReal),
    marginRealPercent: round2(marginRealPercent * 100),
    marginGap: round2(marginGap),
    costTotal: round2(costTotal),
    costLabor: round2(costLabor),
    costMaterials: round2(costMaterials),
    costSubcontractors: round2(costSubcontractors),
    costEquipment: round2(costEquipment),
    costTravel: round2(costTravel),
    costPermits: round2(costPermits),
    costCac: round2(costCac),
    costOverhead: round2(costOverhead),
    costBuffer: round2(costBuffer),
    costProduction: round2(costProduction),
    profitNet: round2(profitNet),
    insight,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function generateInsight(
  input: SubmissionInput,
  cr: number,
  price: number,
  ratio: number,
  status: DecisionStatus,
  profile: string
): string {
  if (status === 'NON_RENTABLE') {
    const biggest = getBiggestCost(input);
    return `Projet non rentable — le poste "${biggest}" représente la charge la plus élevée, envisagez une renégociation.`;
  }
  if (status === 'RENEGOCIER') {
    return `Marge too serrée (ratio ${ratio.toFixed(2)}) — négociez le prix ou réduisez le scope pour atteindre la rentabilité.`;
  }
  if (status === 'STRATEGIQUE') {
    return `Projet déficitaire mais score stratégique élevé — acceptation recommandée pour valeur long terme.`;
  }
  if (status === 'OK_FRAGILE') {
    return `Rentabilité fragile — tout imprévu peut compromettre la marge. Surveillez de près l'exécution.`;
  }
  if (input.objective === 'nouveau_client') {
    return `Bonne opportunité d'acquisition client avec une marge acceptable — prix ajusté pour maximiser les chances.`;
  }
  return `Projet rentable avec une marge confortable — conditions favorables pour soumissionner.`;
}

function getBiggestCost(input: SubmissionInput): string {
  const labor = input.employees * input.days * input.hoursPerDay * input.hourlyRate;
  const materials = input.materialsGlobal || input.materialsDetailed.reduce((s, m) => s + m.quantity * m.unitPrice, 0);
  const costs: [string, number][] = [
    ['main-d\'œuvre', labor],
    ['matériaux', materials],
    ['sous-traitants', input.subcontractors],
    ['équipements', input.equipment],
  ];
  costs.sort((a, b) => b[1] - a[1]);
  return costs[0][0];
}
