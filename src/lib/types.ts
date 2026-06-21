export type Mode = 'quick' | 'standard' | 'pro';

export type TradeType =
  | 'nettoyage' | 'entretien' | 'paysagement'
  | 'hvac' | 'plomberie' | 'electricite'
  | 'renovation' | 'toiture' | 'peinture'
  | 'excavation' | 'beton' | 'genie_civil';

export type ProfileType = 'simple' | 'installation' | 'construction' | 'travaux_lourds';

export type MeasureUnit = 'pi2' | 'm2' | 'm3' | 'unite' | 'intervention' | 'heure_machine' | 'forfait';

export type Complexity = 'standard' | 'eleve' | 'extreme';

export type Objective =
  | 'maximiser_profit'
  | 'maximiser_chances'
  | 'remplir_capacite'
  | 'nouveau_client'
  | 'strategique';

export type Level = 'faible' | 'moyen' | 'eleve';

export type DecisionStatus = 'OK' | 'OK_FRAGILE' | 'RENEGOCIER' | 'NON_RENTABLE' | 'STRATEGIQUE';

export interface MaterialLine {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface LaborRole {
  role: string;
  count: number;
  hourlyRate: number;
  hoursPerDay: number;
  days: number;
}

export interface OverheadLine {
  label: string;
  amount: number;
}

export type ClientSegment = 'residentiel' | 'commercial' | 'institutionnel' | 'industriel';

export const CLIENT_SEGMENT_LABELS: Record<ClientSegment, string> = {
  residentiel: 'Résidentiel',
  commercial: 'Commercial',
  institutionnel: 'Institutionnel',
  industriel: 'Industriel',
};

export interface SubmissionInput {
  mode: Mode;
  // Config
  trade: TradeType;
  objective: Objective;
  unit: MeasureUnit;
  quantity: number;
  complexity: Complexity;
  // Labor
  employees: number;
  days: number;
  hoursPerDay: number;
  hourlyRate: number;
  // Pro: labor by role
  laborRoles: LaborRole[];
  // Materials
  materialsGlobal: number;
  materialsDetailed: MaterialLine[];
  // Subcontractors
  subcontractors: number;
  // Equipment
  equipment: number;
  // Travel
  travelLevel: Level;
  travelKm: number;
  travelFrequency: number;
  travelCostPerKm: number;
  // Permits
  permits: number;
  // CAC
  cacLevel: Level;
  cacAmount: number;
  // Pro: CAC pipeline
  cacLeadsTotal: number;
  cacConversionRate: number;
  cacCostPerLead: number;
  // Overhead
  overhead: number;
  // Pro: overhead détaillé
  overheadDetailed: OverheadLine[];
  // Buffer
  bufferPercent: number;
  // Margin
  marginType: 'percent' | 'dollar';
  marginValue: number;
  // Target price
  targetPrice: number;
  // Pro: capacity
  capacityCurrentPercent: number;
  capacityMaxProjects: number;
  capacityActiveProjects: number;
  // Pro: client segmentation
  clientSegment: ClientSegment;
  clientIsRecurring: boolean;
  clientLifetimeValue: number;
  // Strategic score
  strategicClientValue: number;
  strategicPortfolio: number;
  strategicAcquisition: number;
  strategicAlignment: number;
}

export interface CalculationResult {
  status: DecisionStatus;
  ratio: number;
  strategicScore: number;
  // Prices
  priceRecommended: number;
  priceMinimum: number;
  priceTarget: number;
  priceAvoid: number;
  // Margins
  marginRequested: number;
  marginRequestedPercent: number;
  marginReal: number;
  marginRealPercent: number;
  marginGap: number;
  // Costs
  costTotal: number;
  costLabor: number;
  costMaterials: number;
  costSubcontractors: number;
  costEquipment: number;
  costTravel: number;
  costPermits: number;
  costCac: number;
  costOverhead: number;
  costBuffer: number;
  costProduction: number;
  // Profit
  profitNet: number;
  // Insight
  insight: string;
}

export const TRADE_LABELS: Record<TradeType, string> = {
  nettoyage: 'Nettoyage',
  entretien: 'Entretien',
  paysagement: 'Paysagement',
  hvac: 'HVAC',
  plomberie: 'Plomberie',
  electricite: 'Électricité',
  renovation: 'Rénovation',
  toiture: 'Toiture',
  peinture: 'Peinture',
  excavation: 'Excavation',
  beton: 'Béton',
  genie_civil: 'Génie civil',
};

export const TRADE_TO_PROFILE: Record<TradeType, ProfileType> = {
  nettoyage: 'simple',
  entretien: 'simple',
  paysagement: 'simple',
  hvac: 'installation',
  plomberie: 'installation',
  electricite: 'installation',
  renovation: 'construction',
  toiture: 'construction',
  peinture: 'construction',
  excavation: 'travaux_lourds',
  beton: 'travaux_lourds',
  genie_civil: 'travaux_lourds',
};

export const PROFILE_LABELS: Record<ProfileType, string> = {
  simple: 'Service simple',
  installation: 'Installation',
  construction: 'Construction / Rénovation',
  travaux_lourds: 'Travaux lourds',
};

export const OBJECTIVE_LABELS: Record<Objective, string> = {
  maximiser_profit: 'Maximiser le profit',
  maximiser_chances: 'Maximiser les chances de gagner',
  remplir_capacite: 'Remplir la capacité',
  nouveau_client: 'Entrer un nouveau client',
  strategique: 'Projet stratégique',
};

export const UNIT_LABELS: Record<MeasureUnit, string> = {
  pi2: 'pi²',
  m2: 'm²',
  m3: 'm³',
  unite: 'Unité',
  intervention: 'Intervention',
  heure_machine: 'Heure machine',
  forfait: 'Forfait',
};

export function getDefaultInput(): SubmissionInput {
  return {
    mode: 'quick',
    trade: 'renovation',
    objective: 'maximiser_profit',
    unit: 'pi2',
    quantity: 0,
    complexity: 'standard',
    employees: 2,
    days: 5,
    hoursPerDay: 8,
    hourlyRate: 35,
    materialsGlobal: 0,
    materialsDetailed: [],
    subcontractors: 0,
    equipment: 0,
    laborRoles: [],
    travelLevel: 'moyen',
    travelKm: 0,
    travelFrequency: 1,
    travelCostPerKm: 0.65,
    permits: 0,
    cacLevel: 'moyen',
    cacAmount: 0,
    cacLeadsTotal: 0,
    cacConversionRate: 20,
    cacCostPerLead: 0,
    overhead: 0,
    overheadDetailed: [],
    bufferPercent: 10,
    capacityCurrentPercent: 70,
    capacityMaxProjects: 10,
    capacityActiveProjects: 7,
    clientSegment: 'residentiel',
    clientIsRecurring: false,
    clientLifetimeValue: 0,
    marginType: 'percent',
    marginValue: 25,
    targetPrice: 0,
    strategicClientValue: 1,
    strategicPortfolio: 1,
    strategicAcquisition: 1,
    strategicAlignment: 1,
  };
}
