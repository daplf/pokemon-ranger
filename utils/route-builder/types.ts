import { GrowthRate, TypeName } from 'relicalc/dist';
import { Nature } from 'relicalc/dist/nature';
import { ExperienceEvent, ExperienceEventWithMetadata } from '../calculations';

// Route Building Configuration
export interface RouteBuilderOption {
  id: string;
  label: string;
  description?: string;
  targetStepId: string;
  prerequisites?: RouteBuilderPrerequisites;
  effects?: RouteBuilderStepEffect[];
}

// Effects that can be applied when taking an action
export interface AddPokemonPartyEffect {
  type: 'addPokemon';
  species: string;
  level: number;
}

export interface UnlockHmEffect {
  type: 'unlockHm';
  hm: RouteBuilderHm;
}

export interface AddItemEffect {
  type: 'addItem';
  item: string;
  quantity?: number;
}

export interface SetProgressionFlagEffect {
  type: 'setProgressionFlag';
  flag: string;
  value: boolean | string | number;
  conditionalOn?: RouteBuilderPrerequisites;
}

export type RouteBuilderStepEffect = AddPokemonPartyEffect | UnlockHmEffect | AddItemEffect | SetProgressionFlagEffect;

// Battle Actions - Wild Battles
export interface RouteBuilderBattleAction {
  id: string;
  label: string;
  description?: string;
  type: 'move' | 'ko' | 'item';
  visibleIfPartyIncludes?: string[];
}

export interface RouteBuilderBattleDefinition {
  actions?: RouteBuilderBattleAction[];
  onKoTargetStepId: string;
  opponent?: RouteBuilderBattlePokemon;
  effects?: RouteBuilderStepEffect[];
}

// Steps in the game route
export interface RouteBuilderStep {
  id: string;
  name: string;
  description?: string;
  options: RouteBuilderOption[];
  effects?: RouteBuilderStepEffect[];
  battle?: RouteBuilderBattleDefinition;
  autoContinueStepId?: string;
  disableItemUsage?: boolean;
}

// Game Configuration
export interface RouteBuilderGameConfig {
  id: string;
  name: string;
  startStepId: string;
  steps: RouteBuilderStep[];
  progressionFlags?: Record<string, boolean | string | number>;
}

// Route History - represents actions taken in the route
export interface RouteBuilderRouteEntry {
  type: 'step' | 'battleAction' | 'trainerBattle' | 'trainerBattleAction' | 'itemUsage' | 'itemTargetSelection';
  stepId: string;
  arrivedViaOptionId?: string;
  battleActionId?: string;
  trainerId?: string;
  trainerPokemonIndex?: number;
  trainerBattleActionType?: 'selectPokemon' | 'move' | 'ko' | 'item';
  label?: string;
  optionEffects?: RouteBuilderStepEffect[];
  itemName?: string;
  targetPokemonIndex?: number;
}

export interface RouteBuilderExportData {
  version: 1 | 2;
  gameId: string;
  route: RouteBuilderRouteEntry[];
  partySnapshots?: RouteBuilderPokemonInParty[][];
}

// Pokemon Data
export interface RouteBuilderBattlePokemon {
  species: string;
  level: number;
  nature: string;
  evs: RouteBuilderStatSpread;
  ivs: RouteBuilderStatSpread;
}

export interface RouteBuilderState {
  party: RouteBuilderPokemonInParty[];
  bag: Record<string, number>;
  progressionFlags?: Record<string, boolean | string | number>;
}

export interface RouteBuilderRuntimeState extends RouteBuilderState {
  currentStep?: RouteBuilderStep;
  activeTrainerBattle: RouteBuilderActiveTrainerBattle | null;
}

export interface RouteBuilderPokemonLearnsetEntry {
  level: number;
  move: string;
}

export interface RouteBuilderPokemonData {
  species: string;
  game: string;
  types: TypeName[];
  growthRate: GrowthRate;
  baseExperience: number;
  evYield: RouteBuilderStatSpread;
  baseStats: RouteBuilderStatSpread;
  learnset: RouteBuilderPokemonLearnsetEntry[];
}

export interface RouteBuilderPokemonInParty {
  species: string;
  initialLevel: number;
  level: number;
  growthRate: GrowthRate;
  nature: Nature;
  evs: RouteBuilderStatSpread;
  ivs: RouteBuilderStatSpread;
  hasRandomIvs: boolean;
  moves: string[];
  experienceEvents: ExperienceEvent[];
  experienceRoute: ExperienceEventWithMetadata[];
}

export interface RouteBuilderStatSpread {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

// Trainer Data
export interface RouteBuilderTrainerPokemon {
  species: string;
  level: number;
  ability?: string;
  item?: string;
  moves: string[];
  nature?: string;
  evs: RouteBuilderStatSpread;
  ivs: RouteBuilderStatSpread;
}

export interface RouteBuilderTrainer {
  id: string;
  trainerId: number;
  game: string;
  name: string;
  prerequisites?: RouteBuilderPrerequisites;
  pokemon: RouteBuilderTrainerPokemon[];
}

export type RouteBuilderHm =
  | 'cut'
  | 'rock-smash'
  | 'surf'
  | 'strength'
  | 'defog'
  | 'waterfall'
  | 'rock-climb';

// Prerequisites for actions/trainers
export interface RouteBuilderPrerequisites {
  // ALL of these trainers must be beaten
  beatenTrainerIds?: string[];
  requiredHms?: RouteBuilderHm[];
  requiredItems?: string[];
  excludedItems?: string[];
  progressionFlags?: Record<string, boolean | string | number>;
  // ANY of these prerequisite sets must be met (OR logic) - recursive structure
  oneOf?: RouteBuilderPrerequisites[];
}

// Move Data
export interface RouteBuilderMoveData {
  name: string;
  game: string;
  type: TypeName;
  category: 'physical' | 'special' | 'status';
  power: number;
}

// Item Data
export interface RouteBuilderItemData {
  name: string;
  game: string;
  category: 'medicine' | 'pokeballs' | 'battle-items' | 'berries' | 'key-items' | 'other';
  canUseInBattle: boolean;
  canUseOutsideBattle: boolean;
  effects: RouteBuilderItemEffect[];
}

export interface RouteBuilderItemEffect {
  type: 'heal' | 'cure-status' | 'boost-stat' | 'evolve' | 'other';
  value?: number; // For heal amount, stat boost amount, etc.
  status?: string; // For status cures
  stat?: string; // For stat boosts
  description: string;
}

// Area/Trainer List Data
export interface RouteBuilderAreaTrainerList {
  id: string;
  game: string;
  name: string;
  trainerIds: string[];
}

// Index Entries for data loading
export interface RouteBuilderIndexEntry {
  id: string;
  name: string;
  file: string;
}

export interface RouteBuilderPokemonIndexEntry {
  species: string;
  file: string;
}

export interface RouteBuilderMoveIndexEntry {
  name: string;
  file: string;
}

export interface RouteBuilderItemIndexEntry {
  name: string;
  file: string;
}

// Active Battle State
export interface RouteBuilderActiveTrainerBattle {
  trainer: RouteBuilderTrainer;
  defeatedPokemonIndexes: number[];
  selectedPokemonIndex: number | null;
}

// Battle Actions - Trainer Battles
export interface RouteBuilderTrainerBattleAction {
  id: string;
  label: string;
  description?: string;
  type: 'selectPokemon' | 'move' | 'ko' | 'item';
  trainerId: string;
  trainerPokemonIndex?: number;
  moveName?: string;
  damageSummary?: string;
  damageDetails?: string[];
  targetHpSummary?: string;
}

export interface RouteBuilderResolvedBattleAction extends RouteBuilderBattleAction {
  damageSummary?: string;
  damageDetails?: string[];
  targetHpSummary?: string;
}
