import { Generation, GrowthRate, Stat, StatLine, TypeName } from 'relicalc/dist';
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

export type RouteBuilderStepEffect = AddPokemonPartyEffect | UnlockHmEffect | AddItemEffect;

// Battle Actions - Wild Battles
export interface RouteBuilderBattleAction {
  id: string;
  label: string;
  description?: string;
  type: 'move' | 'ko';
  visibleIfPartyIncludes?: string[];
}

export interface RouteBuilderBattleDefinition {
  actions: RouteBuilderBattleAction[];
  onKoTargetStepId: string;
  opponent?: RouteBuilderBattlePokemon;
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
}

// Game Configuration
export interface RouteBuilderGameConfig {
  id: string;
  name: string;
  startStepId: string;
  steps: RouteBuilderStep[];
}

// Route History - represents actions taken in the route
export interface RouteBuilderRouteEntry {
  type: 'step' | 'battleAction' | 'trainerBattle' | 'trainerBattleAction';
  stepId: string;
  arrivedViaOptionId?: string;
  battleActionId?: string;
  trainerId?: string;
  trainerPokemonIndex?: number;
  trainerBattleActionType?: 'selectPokemon' | 'move' | 'ko';
  label?: string;
  optionEffects?: RouteBuilderStepEffect[];
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
  beatenTrainerIds?: string[];
  requiredHms?: RouteBuilderHm[];
  requiredItems?: string[];
  excludedItems?: string[];
}

// Move Data
export interface RouteBuilderMoveData {
  name: string;
  game: string;
  type: TypeName;
  category: 'physical' | 'special' | 'status';
  power: number;
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
  type: 'selectPokemon' | 'move' | 'ko';
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
