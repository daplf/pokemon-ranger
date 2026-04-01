import {
  Generation,
  GrowthRate,
  calculateDamageRanges,
  calculateDamageValues,
  calculateHP,
  calculateMoveEffectiveness,
  calculateStat,
  combineIdenticalLines,
  formatIVRangeSet,
  getNatureMultiplier,
  NATURES,
} from 'relicalc';
import { Nature } from 'relicalc/dist/nature';
import { Stat, StatLine } from 'relicalc/dist/reference';
import { TypeName } from 'relicalc/dist/pokemonTypes';
import { buildExperienceRoute, ExperienceEvent, ExperienceEventWithMetadata, SpeciesExperienceEvent } from './calculations';
import bdspConfig from '../resources/route-builder/bdsp.json';
import bdspAreaIndex from '../resources/route-builder/bdsp-area-index.json';
import bdspMoveIndex from '../resources/route-builder/bdsp-move-index.json';
import bdspPokemonIndex from '../resources/route-builder/bdsp-pokemon-index.json';
import bdspTrainerIndex from '../resources/route-builder/bdsp-trainer-index.json';

export interface RouteBuilderOption {
  id: string;
  label: string;
  description?: string;
  targetStepId: string;
  prerequisites?: RouteBuilderPrerequisites;
  effects?: RouteBuilderStepEffect[];
}

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

export interface RouteBuilderStep {
  id: string;
  name: string;
  description?: string;
  options: RouteBuilderOption[];
  effects?: RouteBuilderStepEffect[];
  battle?: RouteBuilderBattleDefinition;
  autoContinueStepId?: string;
}

export interface RouteBuilderGameConfig {
  id: string;
  name: string;
  startStepId: string;
  steps: RouteBuilderStep[];
}

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

export interface RouteBuilderPrerequisites {
  beatenTrainerIds?: string[];
  requiredHms?: RouteBuilderHm[];
  requiredItems?: string[];
  excludedItems?: string[];
}

export interface RouteBuilderMoveData {
  name: string;
  game: string;
  type: TypeName;
  category: 'physical' | 'special' | 'status';
  power: number;
}

export interface RouteBuilderAreaTrainerList {
  id: string;
  game: string;
  name: string;
  trainerIds: string[];
}

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

export interface RouteBuilderActiveTrainerBattle {
  trainer: RouteBuilderTrainer;
  defeatedPokemonIndexes: number[];
  selectedPokemonIndex: number | null;
}

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

const GAME_CONFIGS: RouteBuilderGameConfig[] = [bdspConfig as RouteBuilderGameConfig];
const POKEMON_INDEX_BY_GAME: Record<string, RouteBuilderPokemonIndexEntry[]> = {
  bdsp: bdspPokemonIndex as RouteBuilderPokemonIndexEntry[],
};
const MOVE_INDEX_BY_GAME: Record<string, RouteBuilderMoveIndexEntry[]> = {
  bdsp: bdspMoveIndex as RouteBuilderMoveIndexEntry[],
};
const TRAINER_INDEX_BY_GAME: Record<string, RouteBuilderIndexEntry[]> = {
  bdsp: bdspTrainerIndex as RouteBuilderIndexEntry[],
};
const AREA_INDEX_BY_GAME: Record<string, RouteBuilderIndexEntry[]> = {
  bdsp: bdspAreaIndex as RouteBuilderIndexEntry[],
};
const POKEMON_DATA_CACHE = new Map<string, RouteBuilderPokemonData>();
const MOVE_DATA_CACHE = new Map<string, RouteBuilderMoveData>();
const TRAINER_DATA_CACHE = new Map<string, RouteBuilderTrainer>();
const AREA_DATA_CACHE = new Map<string, RouteBuilderAreaTrainerList>();
const DEFAULT_STAT_SPREAD: RouteBuilderStatSpread = {
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
};
const DEFAULT_IV_SPREAD: RouteBuilderStatSpread = {
  hp: 31,
  attack: 31,
  defense: 31,
  specialAttack: 31,
  specialDefense: 31,
  speed: 31,
};
const BDSP_EXPERIENCE_GENERATION: Generation = 7;

export function getRouteBuilderGames(): RouteBuilderGameConfig[] {
  return GAME_CONFIGS;
}

export function getRouteBuilderGame(gameId: string): RouteBuilderGameConfig | undefined {
  return GAME_CONFIGS.find(game => game.id === gameId);
}

export function getRouteBuilderStep(game: RouteBuilderGameConfig, stepId: string): RouteBuilderStep | undefined {
  return game.steps.find(step => step.id === stepId);
}

export function getCurrentRouteBuilderStep(
  game: RouteBuilderGameConfig,
  route: RouteBuilderRouteEntry[],
): RouteBuilderStep | undefined {
  const currentEntry = [...route].reverse().find(entry => entry.type === 'step');

  if (!currentEntry) return undefined;

  return getRouteBuilderStep(game, currentEntry.stepId);
}

export function getAvailableOptionsForStep(
  game: RouteBuilderGameConfig,
  step: RouteBuilderStep,
  route: RouteBuilderRouteEntry[],
): RouteBuilderOption[] {
  const beatenTrainerIds = getDefeatedTrainerIds(game.id, route);
  const unlockedHms = getUnlockedHms(game, route);
  const bag = buildRouteBuilderState(game, route).bag;

  return step.options.filter(option => prerequisitesAreMet(option.prerequisites, beatenTrainerIds, unlockedHms, bag));
}

export function buildInitialRoute(game: RouteBuilderGameConfig): RouteBuilderRouteEntry[] {
  return [{
    type: 'step',
    stepId: game.startStepId,
  }];
}

export function buildRouteExportData(
  gameId: string,
  route: RouteBuilderRouteEntry[],
  partySnapshots: RouteBuilderPokemonInParty[][],
): RouteBuilderExportData {
  return {
    version: 2,
    gameId,
    route,
    partySnapshots,
  };
}

export function parseRouteBuilderImport(data: unknown): RouteBuilderExportData {
  if (!data || typeof data !== 'object') {
    throw new Error('Route file contents must be a JSON object.');
  }

  const { version, gameId, route } = data as Partial<RouteBuilderExportData>;

  if (version !== 1 && version !== 2) {
    throw new Error('Unsupported route file version.');
  }

  if (typeof gameId !== 'string' || gameId.length === 0) {
    throw new Error('Route file is missing a valid game id.');
  }

  const game = getRouteBuilderGame(gameId);

  if (!game) {
    throw new Error(`Unsupported game "${gameId}".`);
  }

  if (!Array.isArray(route) || route.length === 0) {
    throw new Error('Route file must contain at least one route entry.');
  }

  let currentStep: RouteBuilderStep | undefined;
  let activeTrainerBattle: RouteBuilderTrainer | null = null;
  let selectedTrainerPokemonIndex: number | null = null;

  route.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Route entry ${index + 1} is invalid.`);
    }

    if (typeof entry.stepId !== 'string' || entry.stepId.length === 0) {
      throw new Error(`Route entry ${index + 1} is missing a valid step id.`);
    }

    if (entry.type === 'step') {
      const step = getRouteBuilderStep(game, entry.stepId);

      if (!step) {
        throw new Error(`Route entry ${index + 1} references an unknown step.`);
      }

      if (index === 0 && entry.stepId !== game.startStepId) {
        throw new Error('Imported routes must begin at the configured starting step.');
      }

      if (index > 0) {
        if (typeof entry.arrivedViaOptionId !== 'string' || entry.arrivedViaOptionId.length === 0) {
          throw new Error(`Route entry ${index + 1} is missing the action used to reach that step.`);
        }

        const matchingOption = currentStep?.options.find(option => option.id === entry.arrivedViaOptionId);

        if (matchingOption) {
          if (matchingOption.targetStepId !== entry.stepId) {
            throw new Error(`Route entry ${index + 1} does not match the selected step transition.`);
          }
        } else {
          const matchingBattleAction = getRouteBuilderBattleAction(currentStep, entry.arrivedViaOptionId);

          if (matchingBattleAction?.type !== 'ko' || currentStep?.battle?.onKoTargetStepId !== entry.stepId) {
            throw new Error(`Route entry ${index + 1} does not match a valid route transition.`);
          }
        }
      }

      currentStep = step;
      activeTrainerBattle = null;
      selectedTrainerPokemonIndex = null;

      return;
    }

    if (entry.type === 'battleAction') {
      const action = getRouteBuilderBattleAction(currentStep, entry.battleActionId);

      if (!action) {
        throw new Error(`Route entry ${index + 1} references an unknown battle action.`);
      }

      return;
    }

    if (entry.type === 'trainerBattle') {
      const trainer = entry.trainerId ? getTrainerData(game.id, entry.trainerId) : undefined;

      if (!trainer) {
        throw new Error(`Route entry ${index + 1} references an unknown trainer.`);
      }

      activeTrainerBattle = trainer;
      selectedTrainerPokemonIndex = null;

      return;
    }

    if (entry.type === 'trainerBattleAction') {
      if (!activeTrainerBattle) {
        throw new Error(`Route entry ${index + 1} is a trainer battle action without an active trainer battle.`);
      }

      if (entry.trainerId !== activeTrainerBattle.id) {
        throw new Error(`Route entry ${index + 1} references the wrong trainer.`);
      }

      if (entry.trainerBattleActionType === 'selectPokemon') {
        if (
          typeof entry.trainerPokemonIndex !== 'number'
          || entry.trainerPokemonIndex < 0
          || entry.trainerPokemonIndex >= activeTrainerBattle.pokemon.length
        ) {
          throw new Error(`Route entry ${index + 1} references an invalid trainer Pokemon.`);
        }

        selectedTrainerPokemonIndex = entry.trainerPokemonIndex;

        return;
      }

      if (entry.trainerBattleActionType === 'ko') {
        if (selectedTrainerPokemonIndex === null) {
          throw new Error(`Route entry ${index + 1} tries to KO a trainer Pokemon before selecting one.`);
        }

        selectedTrainerPokemonIndex = null;

        return;
      }

      if (entry.trainerBattleActionType !== 'move') {
        throw new Error(`Route entry ${index + 1} has an unsupported trainer battle action.`);
      }

      return;
    }

    throw new Error(`Route entry ${index + 1} has an unsupported type.`);
  });

  if (version === 2) {
    if (!Array.isArray((data as RouteBuilderExportData).partySnapshots)) {
      throw new Error('Route file is missing party snapshots.');
    }

    const partySnapshots = (data as RouteBuilderExportData).partySnapshots ?? [];

    if (partySnapshots.length !== route.length) {
      throw new Error('Route file party snapshots do not line up with the route history.');
    }

    partySnapshots.forEach((partySnapshot, index) => {
      if (!Array.isArray(partySnapshot)) {
        throw new Error(`Party snapshot ${index + 1} is invalid.`);
      }

      partySnapshot.forEach((pokemon, pokemonIndex) => {
        if (!pokemon || typeof pokemon !== 'object') {
          throw new Error(`Party snapshot ${index + 1}, Pokemon ${pokemonIndex + 1} is invalid.`);
        }

        if (typeof pokemon.species !== 'string' || typeof pokemon.level !== 'number' || !Array.isArray(pokemon.moves)) {
          throw new Error(`Party snapshot ${index + 1}, Pokemon ${pokemonIndex + 1} is missing required data.`);
        }
      });
    });

    return {
      version,
      gameId,
      route,
      partySnapshots,
    };
  }

  return {
    version,
    gameId,
    route,
  };
}

function clonePartyState(party: RouteBuilderPokemonInParty[]): RouteBuilderPokemonInParty[] {
  return party.map(pokemon => ({
    ...pokemon,
    evs: { ...pokemon.evs },
    ivs: { ...pokemon.ivs },
    moves: [...pokemon.moves],
    experienceEvents: pokemon.experienceEvents.map(event => ({ ...event })),
    experienceRoute: pokemon.experienceRoute.map(event => ({
      ...event,
      evs: event.evs ? [...event.evs] : event.evs,
    })),
  }));
}

function hydratePokemonPartyState(gameId: string, pokemon: RouteBuilderPokemonInParty): RouteBuilderPokemonInParty {
  if (pokemon.moves.length > 0) return pokemon;

  return {
    ...pokemon,
    moves: getMovesForLevel(gameId, pokemon.species, pokemon.level),
  };
}

function hydratePartyState(gameId: string, party: RouteBuilderPokemonInParty[]): RouteBuilderPokemonInParty[] {
  return party.map(pokemon => hydratePokemonPartyState(gameId, pokemon));
}

export function hydrateRouteBuilderPartySnapshots(
  gameId: string,
  partySnapshots: RouteBuilderPokemonInParty[][],
): RouteBuilderPokemonInParty[][] {
  return partySnapshots.map(partySnapshot => hydratePartyState(gameId, clonePartyState(partySnapshot)));
}

export function applyRouteBuilderEntry(
  game: RouteBuilderGameConfig,
  state: RouteBuilderRuntimeState,
  entry: RouteBuilderRouteEntry,
  index: number,
): RouteBuilderRuntimeState {
  if (entry.type === 'step') {
    const step = getRouteBuilderStep(game, entry.stepId);

    if (!step) {
      return {
        ...state,
        currentStep: undefined,
      };
    }

    const effectsToApply: RouteBuilderStepEffect[] = [
      ...(step.effects ?? []),
      ...(entry.optionEffects ?? []),
    ];

    let updatedParty = state.party;
    let updatedBag = { ...state.bag };

    effectsToApply.forEach(effect => {
      if (effect.type === 'addPokemon') {
        if (updatedParty.length < 6) {
          updatedParty = [...updatedParty, buildPokemonInParty(game.id, effect.species, effect.level)];
        }
      }

      if (effect.type === 'addItem') {
        const quantity = effect.quantity ?? 1;
        const previousQuantity = updatedBag[effect.item] ?? 0;

        updatedBag = {
          ...updatedBag,
          [effect.item]: previousQuantity + quantity,
        };
      }

      // unlockHm currently does not affect runtime state directly
    });

    return {
      ...state,
      currentStep: step,
      party: updatedParty,
      bag: updatedBag,
    };
  }

  if (entry.type === 'battleAction') {
    const battleAction = getRouteBuilderBattleAction(state.currentStep, entry.battleActionId);

    if (battleAction?.type !== 'ko' || !state.currentStep?.battle?.opponent) return state;

    return {
      ...state,
      party: applyExperienceToLeadPokemon(
        game.id,
        state.party,
        state.currentStep.battle.opponent,
        `wild-${index}`,
        true,
      ),
    };
  }

  if (entry.type === 'trainerBattle') {
    const trainer = entry.trainerId ? getTrainerData(game.id, entry.trainerId) : undefined;

    if (!trainer) return state;

    return {
      ...state,
      activeTrainerBattle: {
        trainer,
        defeatedPokemonIndexes: [],
        selectedPokemonIndex: null,
      },
    };
  }

  if (entry.type === 'trainerBattleAction' && state.activeTrainerBattle) {
    if (entry.trainerBattleActionType === 'selectPokemon' && typeof entry.trainerPokemonIndex === 'number') {
      return {
        ...state,
        activeTrainerBattle: {
          ...state.activeTrainerBattle,
          selectedPokemonIndex: entry.trainerPokemonIndex,
        },
      };
    }

    if (
      entry.trainerBattleActionType === 'ko'
      && typeof state.activeTrainerBattle.selectedPokemonIndex === 'number'
    ) {
      const defeatedPokemon = state.activeTrainerBattle.trainer.pokemon[state.activeTrainerBattle.selectedPokemonIndex];
      const updatedParty = applyExperienceToLeadPokemon(
        game.id,
        state.party,
        asBattlePokemon(defeatedPokemon),
        `trainer-${state.activeTrainerBattle.trainer.id}-${index}`,
        false,
      );
      const defeatedPokemonIndexes = [
        ...state.activeTrainerBattle.defeatedPokemonIndexes,
        state.activeTrainerBattle.selectedPokemonIndex,
      ];
      const defeatedUniqueIndexes = [...new Set(defeatedPokemonIndexes)];

      if (defeatedUniqueIndexes.length >= state.activeTrainerBattle.trainer.pokemon.length) {
        return {
          ...state,
          party: updatedParty,
          activeTrainerBattle: null,
        };
      }

      return {
        ...state,
        party: updatedParty,
        activeTrainerBattle: {
          ...state.activeTrainerBattle,
          defeatedPokemonIndexes: defeatedUniqueIndexes,
          selectedPokemonIndex: null,
        },
      };
    }
  }

  return state;
}

export function buildRouteBuilderPartySnapshots(
  game: RouteBuilderGameConfig,
  route: RouteBuilderRouteEntry[],
): RouteBuilderPokemonInParty[][] {
  let runtimeState: RouteBuilderRuntimeState = {
    party: [],
    bag: {},
    activeTrainerBattle: null,
  };

  return route.map((entry, index) => {
    runtimeState = applyRouteBuilderEntry(game, runtimeState, entry, index);

    return hydratePartyState(game.id, clonePartyState(runtimeState.party));
  });
}

export function getRouteBuilderRuntimeState(
  game: RouteBuilderGameConfig,
  route: RouteBuilderRouteEntry[],
  partyOverride?: RouteBuilderPokemonInParty[],
): RouteBuilderRuntimeState {
  const derivedState = route.reduce<RouteBuilderRuntimeState>((state, entry, index) => (
    applyRouteBuilderEntry(game, state, entry, index)
  ), {
    party: [],
    bag: {},
    activeTrainerBattle: null,
  });

  return partyOverride
    ? {
      ...derivedState,
      party: hydratePartyState(game.id, clonePartyState(partyOverride)),
    }
    : derivedState;
}

export function buildRouteBuilderState(
  game: RouteBuilderGameConfig,
  route: RouteBuilderRouteEntry[],
): RouteBuilderState {
  const finalState = getRouteBuilderRuntimeState(game, route);

  return {
    party: finalState.party,
    bag: finalState.bag,
  };
}

export function getRouteBuilderPokemonData(gameId: string, species: string): RouteBuilderPokemonData | undefined {
  const entry = POKEMON_INDEX_BY_GAME[gameId]?.find(item => item.species === species);

  if (!entry) return undefined;

  const cacheKey = `${gameId}:${entry.species}`;
  const cachedPokemon = POKEMON_DATA_CACHE.get(cacheKey);

  if (cachedPokemon) return cachedPokemon;

  // eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires
  const pokemonData = require(`../resources/route-builder/${entry.file}`) as RouteBuilderPokemonData;
  POKEMON_DATA_CACHE.set(cacheKey, pokemonData);

  return pokemonData;
}

export function getMovesForLevel(gameId: string, species: string, level: number): string[] {
  const pokemon = getRouteBuilderPokemonData(gameId, species);

  if (!pokemon) return [];

  return pokemon.learnset
    .filter(entry => entry.level <= level)
    .map(entry => entry.move)
    .slice(-4);
}

export function buildPokemonInParty(gameId: string, species: string, level: number): RouteBuilderPokemonInParty {
  const pokemonData = getRouteBuilderPokemonData(gameId, species);

  return {
    species,
    initialLevel: level,
    level,
    growthRate: pokemonData?.growthRate ?? 'medium-fast',
    nature: 'hardy',
    evs: { ...DEFAULT_STAT_SPREAD },
    ivs: { ...DEFAULT_IV_SPREAD },
    hasRandomIvs: true,
    moves: getMovesForLevel(gameId, species, level),
    experienceEvents: [],
    experienceRoute: [],
  };
}

export function getRouteBuilderMoveData(gameId: string, moveName: string): RouteBuilderMoveData | undefined {
  const entry = MOVE_INDEX_BY_GAME[gameId]?.find(item => item.name === moveName);

  if (!entry) return undefined;

  const cacheKey = `${gameId}:${entry.name}`;
  const cachedMove = MOVE_DATA_CACHE.get(cacheKey);

  if (cachedMove) return cachedMove;

  // eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires
  const moveData = require(`../resources/route-builder/${entry.file}`) as RouteBuilderMoveData;
  MOVE_DATA_CACHE.set(cacheKey, moveData);

  return moveData;
}

function getNatureModifierForStat(natureName: string, stat: Stat): number {
  const natureKey = natureName.toLowerCase() as Nature;
  const natureDefinition = NATURES[natureKey] ?? NATURES.hardy;

  return getNatureMultiplier(stat, natureDefinition);
}

function getStatSpreadValue(spread: RouteBuilderStatSpread, stat: Stat): number {
  switch (stat) {
    case 'hp':
      return spread.hp;
    case 'attack':
      return spread.attack;
    case 'defense':
      return spread.defense;
    case 'spAttack':
      return spread.specialAttack;
    case 'spDefense':
      return spread.specialDefense;
    case 'speed':
      return spread.speed;
    default:
      return 0;
  }
}

function getBaseStatValue(baseStats: RouteBuilderStatSpread, stat: Stat): number {
  return getStatSpreadValue(baseStats, stat);
}

function evSetToStatSpread(evs: [number, number, number, number, number, number]): RouteBuilderStatSpread {
  return {
    hp: evs[0],
    attack: evs[1],
    defense: evs[2],
    specialAttack: evs[3],
    specialDefense: evs[4],
    speed: evs[5],
  };
}

function calculatePokemonStats(
  gameId: string,
  pokemon: RouteBuilderBattlePokemon | RouteBuilderPokemonInParty,
): StatLine | undefined {
  const pokemonData = getRouteBuilderPokemonData(gameId, pokemon.species);

  if (!pokemonData) return undefined;

  return {
    hp: calculateHP(pokemon.level, pokemonData.baseStats.hp, pokemon.ivs.hp, pokemon.evs.hp, 8),
    attack: calculateStat(
      pokemon.level,
      pokemonData.baseStats.attack,
      pokemon.ivs.attack,
      pokemon.evs.attack,
      getNatureModifierForStat(pokemon.nature, 'attack'),
    ),
    defense: calculateStat(
      pokemon.level,
      pokemonData.baseStats.defense,
      pokemon.ivs.defense,
      pokemon.evs.defense,
      getNatureModifierForStat(pokemon.nature, 'defense'),
    ),
    spAttack: calculateStat(
      pokemon.level,
      pokemonData.baseStats.specialAttack,
      pokemon.ivs.specialAttack,
      pokemon.evs.specialAttack,
      getNatureModifierForStat(pokemon.nature, 'spAttack'),
    ),
    spDefense: calculateStat(
      pokemon.level,
      pokemonData.baseStats.specialDefense,
      pokemon.ivs.specialDefense,
      pokemon.evs.specialDefense,
      getNatureModifierForStat(pokemon.nature, 'spDefense'),
    ),
    speed: calculateStat(
      pokemon.level,
      pokemonData.baseStats.speed,
      pokemon.ivs.speed,
      pokemon.evs.speed,
      getNatureModifierForStat(pokemon.nature, 'speed'),
    ),
  };
}

function formatHitCountSummary(targetHp: number, minDamage: number, maxDamage: number): string {
  if (targetHp <= 0 || maxDamage <= 0) return 'No KO';

  const safestMinDamage = Math.max(minDamage, 1);
  const fastestKo = Math.ceil(targetHp / maxDamage);
  const slowestKo = Math.ceil(targetHp / safestMinDamage);

  return fastestKo === slowestKo
    ? `${fastestKo}HKO`
    : `${fastestKo}-${slowestKo}HKO`;
}

function asBattlePokemon(pokemon: RouteBuilderTrainerPokemon): RouteBuilderBattlePokemon {
  return {
    species: pokemon.species,
    level: pokemon.level,
    nature: pokemon.nature ?? 'Hardy',
    evs: pokemon.evs,
    ivs: pokemon.ivs,
  };
}

function buildExperienceEventFromPokemon(
  gameId: string,
  defeatedPokemon: RouteBuilderBattlePokemon,
  id: string,
  isWild: boolean,
  partySize: number,
): SpeciesExperienceEvent | null {
  const pokemonData = getRouteBuilderPokemonData(gameId, defeatedPokemon.species);

  if (!pokemonData) return null;

  return {
    id,
    enabled: true,
    type: 'species',
    name: `${isWild ? 'Wild' : 'Trainer'} ${defeatedPokemon.species} Lv. ${defeatedPokemon.level}`,
    baseExperience: pokemonData.baseExperience,
    level: defeatedPokemon.level,
    expShareEnabled: false,
    participated: true,
    otherParticipantCount: 0,
    otherPokemonHoldingExperienceShare: 0,
    partySize,
    isTrade: false,
    isInternationalTrade: false,
    hasLuckyEgg: false,
    hasAffectionBoost: false,
    isWild,
    isPastEvolutionPoint: false,
    hpEVValue: pokemonData.evYield.hp,
    attackEVValue: pokemonData.evYield.attack,
    defenseEVValue: pokemonData.evYield.defense,
    spAttackEVValue: pokemonData.evYield.specialAttack,
    spDefenseEVValue: pokemonData.evYield.specialDefense,
    speedEVValue: pokemonData.evYield.speed,
  };
}

function applyExperienceToLeadPokemon(
  gameId: string,
  party: RouteBuilderPokemonInParty[],
  defeatedPokemon: RouteBuilderBattlePokemon,
  eventId: string,
  isWild: boolean,
): RouteBuilderPokemonInParty[] {
  if (party.length === 0) return party;

  const [leadPokemon, ...remainingParty] = party;
  const experienceEvent = buildExperienceEventFromPokemon(
    gameId,
    defeatedPokemon,
    eventId,
    isWild,
    party.length,
  );

  if (!experienceEvent) return party;

  const experienceEvents = [...leadPokemon.experienceEvents, experienceEvent];
  const experienceRoute = buildExperienceRoute(
    BDSP_EXPERIENCE_GENERATION,
    leadPokemon.initialLevel,
    leadPokemon.growthRate,
    experienceEvents,
  );
  const latestEvent = experienceRoute[experienceRoute.length - 1];
  const nextLevel = latestEvent?.levelAfterExperience ?? leadPokemon.level;
  const nextEvs = latestEvent ? evSetToStatSpread(latestEvent.evs) : leadPokemon.evs;

  return [{
    ...leadPokemon,
    level: nextLevel,
    evs: nextEvs,
    moves: getMovesForLevel(gameId, leadPokemon.species, nextLevel),
    experienceEvents,
    experienceRoute,
  }, ...remainingParty];
}

function calculateBattleDamage(
  gameId: string,
  attacker: RouteBuilderPokemonInParty,
  defender: RouteBuilderBattlePokemon,
  moveName: string,
): { summary: string; details?: string[]; } | null {
  const moveData = getRouteBuilderMoveData(gameId, moveName);
  const attackerData = getRouteBuilderPokemonData(gameId, attacker.species);
  const defenderData = getRouteBuilderPokemonData(gameId, defender.species);
  const attackerStats = calculatePokemonStats(gameId, attacker);
  const defenderStats = calculatePokemonStats(gameId, defender);

  if (!moveData || !attackerData || !defenderData || !attackerStats || !defenderStats) return null;
  if (moveData.category === 'status' || moveData.power <= 0) return null;

  const offensiveStat = moveData.category === 'physical' ? 'attack' : 'spAttack';
  const defensiveStat = moveData.category === 'physical' ? defenderStats.defense : defenderStats.spDefense;
  const attackStat = moveData.category === 'physical' ? attackerStats.attack : attackerStats.spAttack;
  const defenseStat = moveData.category === 'physical' ? defenderStats.defense : defenderStats.spDefense;
  const stabModifier = attackerData.types.includes(moveData.type) ? 1.5 : 1;
  const effectivenessModifier = calculateMoveEffectiveness(moveData.type, 8, ...defenderData.types);

  if (attacker.hasRandomIvs) {
    const compactRanges = combineIdenticalLines(calculateDamageRanges({
      level: attacker.level,
      baseStat: getBaseStatValue(attackerData.baseStats, offensiveStat),
      evs: getStatSpreadValue(attacker.evs, offensiveStat),
      combatStages: 0,
      stab: stabModifier > 1,
      typeEffectiveness: effectivenessModifier,
      offensiveMode: true,
      movePower: moveData.power,
      criticalHit: false,
      doubles: false,
      torrent: false,
      multiTarget: false,
      weatherBoosted: false,
      weatherReduced: false,
      generation: 8,
      otherModifier: 1,
      opponentLevel: defender.level,
      opponentStat: defensiveStat,
      opponentCombatStages: 0,
      friendship: 0,
      screen: false,
      choiceItem: false,
      adaptability: false,
      terastallized: false,
      statModifier: 1,
      opponentStatModifier: 1,
      otherPowerModifier: 1,
    }));
    const details = compactRanges.map(range => (
      `${range.damageRangeOutput} damage (${formatHitCountSummary(defenderStats.hp, range.minDamage, range.maxDamage)}, IVs ${formatIVRangeSet(range)})`
    ));

    return {
      summary: details[0] ?? 'No damage',
      details,
    };
  }

  const rolls = calculateDamageValues(
    attacker.level,
    moveData.power,
    attackStat,
    defenseStat,
    [1],
    [1],
    [stabModifier, effectivenessModifier],
  );

  return {
    summary: `${formatDamageSummary({
      min: Math.min(...rolls),
      max: Math.max(...rolls),
    })} (${formatHitCountSummary(defenderStats.hp, Math.min(...rolls), Math.max(...rolls))})`,
  };
}

function formatDamageSummary(damageRange: { min: number; max: number; }): string {
  return damageRange.min === damageRange.max
    ? `${damageRange.min} damage`
    : `${damageRange.min}-${damageRange.max} damage`;
}

export function getAvailableRouteBuilderBattleActions(
  game: RouteBuilderGameConfig,
  route: RouteBuilderRouteEntry[],
  partyOverride?: RouteBuilderPokemonInParty[],
): RouteBuilderResolvedBattleAction[] {
  const currentStep = getCurrentRouteBuilderStep(game, route);

  if (!currentStep?.battle) return [];

  const state = partyOverride
    ? { party: clonePartyState(partyOverride) }
    : buildRouteBuilderState(game, route);
  const leadPokemon = state.party[0];
  const { opponent } = currentStep.battle;

  return currentStep.battle.actions.filter(action => {
    if (!action.visibleIfPartyIncludes || action.visibleIfPartyIncludes.length === 0) return true;

    return action.visibleIfPartyIncludes.some(species => (
      state.party.some(pokemon => pokemon.species === species)
    ));
  }).map(action => {
    if (!leadPokemon || !opponent || action.type !== 'move') return action;

    const damageResult = calculateBattleDamage(game.id, leadPokemon, opponent, action.label.replace(/^Use /, ''));
    const opponentStats = calculatePokemonStats(game.id, opponent);

    return {
      ...action,
      targetHpSummary: opponentStats ? `Target HP: ${opponentStats.hp}` : undefined,
      damageSummary: damageResult?.summary ?? 'No damage',
      damageDetails: damageResult?.details,
    };
  });
}

export function getAreaTrainerList(gameId: string, areaId: string): RouteBuilderAreaTrainerList | undefined {
  const entry = AREA_INDEX_BY_GAME[gameId]?.find(item => item.id === areaId);

  if (!entry) return undefined;

  const cacheKey = `${gameId}:${entry.id}`;
  const cachedArea = AREA_DATA_CACHE.get(cacheKey);

  if (cachedArea) return cachedArea;

  // eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires
  const areaData = require(`../resources/route-builder/${entry.file}`) as RouteBuilderAreaTrainerList;
  AREA_DATA_CACHE.set(cacheKey, areaData);

  return areaData;
}

export function getTrainerData(gameId: string, trainerId: string): RouteBuilderTrainer | undefined {
  const entry = TRAINER_INDEX_BY_GAME[gameId]?.find(item => item.id === trainerId);

  if (!entry) return undefined;

  const cacheKey = `${gameId}:${entry.id}`;
  const cachedTrainer = TRAINER_DATA_CACHE.get(cacheKey);

  if (cachedTrainer) return cachedTrainer;

  // eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires
  const trainerData = require(`../resources/route-builder/${entry.file}`) as RouteBuilderTrainer;
  const normalizedTrainerData = {
    ...trainerData,
    pokemon: trainerData.pokemon.map(pokemon => ({
      ...pokemon,
      moves: pokemon.moves.filter(move => move !== '--'),
    })),
  };

  TRAINER_DATA_CACHE.set(cacheKey, normalizedTrainerData);

  return normalizedTrainerData;
}

export function getTrainersForStep(gameId: string, stepId: string): RouteBuilderTrainer[] {
  const area = getAreaTrainerList(gameId, stepId);

  if (!area) return [];

  return area.trainerIds
    .map(trainerId => getTrainerData(gameId, trainerId))
    .filter((trainer): trainer is RouteBuilderTrainer => Boolean(trainer));
}

export function getAvailableTrainersForStep(
  gameId: string,
  stepId: string,
  route: RouteBuilderRouteEntry[],
): RouteBuilderTrainer[] {
  const area = getAreaTrainerList(gameId, stepId);

  if (!area) return [];

  const beatenTrainerIds = getDefeatedTrainerIds(gameId, route);
  const unlockedHms = getUnlockedHmsByGameId(gameId, route);

  return area.trainerIds
    .map(trainerId => getTrainerData(gameId, trainerId))
    .filter((trainer): trainer is RouteBuilderTrainer => Boolean(trainer))
    .filter(trainer => trainerIsAvailable(trainer, beatenTrainerIds, unlockedHms));
}

export function getActiveTrainerBattle(
  gameId: string,
  route: RouteBuilderRouteEntry[],
): RouteBuilderActiveTrainerBattle | null {
  return route.reduce<RouteBuilderActiveTrainerBattle | null>((activeBattle, entry) => {
    if (entry.type === 'trainerBattle') {
      const trainer = entry.trainerId ? getTrainerData(gameId, entry.trainerId) : undefined;

      if (!trainer) return activeBattle;

      return {
        trainer,
        defeatedPokemonIndexes: [],
        selectedPokemonIndex: null,
      };
    }

    if (entry.type !== 'trainerBattleAction' || !activeBattle) return activeBattle;

    if (entry.trainerBattleActionType === 'selectPokemon' && typeof entry.trainerPokemonIndex === 'number') {
      return {
        ...activeBattle,
        selectedPokemonIndex: entry.trainerPokemonIndex,
      };
    }

    if (entry.trainerBattleActionType === 'ko' && typeof activeBattle.selectedPokemonIndex === 'number') {
      const defeatedPokemonIndexes = [...activeBattle.defeatedPokemonIndexes, activeBattle.selectedPokemonIndex];
      const defeatedUniqueIndexes = [...new Set(defeatedPokemonIndexes)];

      if (defeatedUniqueIndexes.length >= activeBattle.trainer.pokemon.length) {
        return null;
      }

      return {
        ...activeBattle,
        defeatedPokemonIndexes: defeatedUniqueIndexes,
        selectedPokemonIndex: null,
      };
    }

    return activeBattle;
  }, null);
}

export function getDefeatedTrainerIds(
  gameId: string,
  route: RouteBuilderRouteEntry[],
): string[] {
  const defeatedTrainerIds = new Set<string>();

  route.reduce<RouteBuilderActiveTrainerBattle | null>((activeBattle, entry) => {
    if (entry.type === 'trainerBattle') {
      const trainer = entry.trainerId ? getTrainerData(gameId, entry.trainerId) : undefined;

      if (!trainer) return activeBattle;

      return {
        trainer,
        defeatedPokemonIndexes: [],
        selectedPokemonIndex: null,
      };
    }

    if (entry.type !== 'trainerBattleAction' || !activeBattle) return activeBattle;

    if (entry.trainerBattleActionType === 'selectPokemon' && typeof entry.trainerPokemonIndex === 'number') {
      return {
        ...activeBattle,
        selectedPokemonIndex: entry.trainerPokemonIndex,
      };
    }

    if (entry.trainerBattleActionType === 'ko' && typeof activeBattle.selectedPokemonIndex === 'number') {
      const defeatedPokemonIndexes = [...activeBattle.defeatedPokemonIndexes, activeBattle.selectedPokemonIndex];
      const defeatedUniqueIndexes = [...new Set(defeatedPokemonIndexes)];

      if (defeatedUniqueIndexes.length >= activeBattle.trainer.pokemon.length) {
        defeatedTrainerIds.add(activeBattle.trainer.id);

        return null;
      }

      return {
        ...activeBattle,
        defeatedPokemonIndexes: defeatedUniqueIndexes,
        selectedPokemonIndex: null,
      };
    }

    return activeBattle;
  }, null);

  return [...defeatedTrainerIds];
}

export function prerequisitesAreMet(
  prerequisites: RouteBuilderPrerequisites | undefined,
  beatenTrainerIds: string[],
  unlockedHms: RouteBuilderHm[],
  bag: Record<string, number>,
): boolean {
  const requiredTrainerIds = prerequisites?.beatenTrainerIds ?? [];
  const requiredHms = prerequisites?.requiredHms ?? [];
  const requiredItems = prerequisites?.requiredItems ?? [];
  const excludedItems = prerequisites?.excludedItems ?? [];

  const hasRequiredItems = requiredItems.every(item => (bag[item] ?? 0) > 0);
  const hasExcludedItems = excludedItems.some(item => (bag[item] ?? 0) > 0);

  if (hasExcludedItems) return false;

  return requiredTrainerIds.every(requiredTrainerId => beatenTrainerIds.includes(requiredTrainerId))
    && requiredHms.every(requiredHm => unlockedHms.includes(requiredHm))
    && hasRequiredItems;
}

export function getUnlockedHms(game: RouteBuilderGameConfig, route: RouteBuilderRouteEntry[]): RouteBuilderHm[] {
  const unlockedHms = new Set<RouteBuilderHm>();

  route
    .filter((entry): entry is RouteBuilderRouteEntry & { type: 'step' } => entry.type === 'step')
    .forEach(entry => {
      const step = getRouteBuilderStep(game, entry.stepId);

      step?.effects?.forEach(effect => {
        if (effect.type === 'unlockHm') {
          unlockedHms.add(effect.hm);
        }
      });
    });

  return [...unlockedHms];
}

function getUnlockedHmsByGameId(gameId: string, route: RouteBuilderRouteEntry[]): RouteBuilderHm[] {
  const game = getRouteBuilderGame(gameId);

  if (!game) return [];

  return getUnlockedHms(game, route);
}

function trainerIsAvailable(
  trainer: RouteBuilderTrainer,
  beatenTrainerIds: string[],
  unlockedHms: RouteBuilderHm[],
): boolean {
  if (beatenTrainerIds.includes(trainer.id)) return false;

  return prerequisitesAreMet(trainer.prerequisites, beatenTrainerIds, unlockedHms);
}

export function getAvailableTrainerBattleActions(
  game: RouteBuilderGameConfig,
  route: RouteBuilderRouteEntry[],
  partyOverride?: RouteBuilderPokemonInParty[],
): RouteBuilderTrainerBattleAction[] {
  const activeTrainerBattle = getActiveTrainerBattle(game.id, route);

  if (!activeTrainerBattle) return [];

  if (activeTrainerBattle.selectedPokemonIndex === null) {
    return activeTrainerBattle.trainer.pokemon
      .map((pokemon, index) => ({ pokemon, index }))
      .filter(({ index }) => !activeTrainerBattle.defeatedPokemonIndexes.includes(index))
      .map(({ pokemon, index }) => ({
        id: `${activeTrainerBattle.trainer.id}-select-${index}`,
        label: `Fight ${pokemon.species} Lv. ${pokemon.level}`,
        description: `${activeTrainerBattle.trainer.name}'s ${pokemon.species}.`,
        type: 'selectPokemon' as const,
        trainerId: activeTrainerBattle.trainer.id,
        trainerPokemonIndex: index,
      }));
  }

  const leadPokemon = partyOverride
    ? clonePartyState(partyOverride)[0]
    : buildRouteBuilderState(game, route).party[0];
  const selectedPokemon = activeTrainerBattle.trainer.pokemon[activeTrainerBattle.selectedPokemonIndex];
  const selectedBattlePokemon = selectedPokemon ? asBattlePokemon(selectedPokemon) : undefined;
  const selectedPokemonStats = selectedBattlePokemon ? calculatePokemonStats(game.id, selectedBattlePokemon) : undefined;

  const moveActions = (leadPokemon?.moves ?? []).map(moveName => {
    const damageResult = selectedBattlePokemon
      ? calculateBattleDamage(game.id, leadPokemon, selectedBattlePokemon, moveName)
      : null;

    return {
      id: `${activeTrainerBattle.trainer.id}-move-${slugify(moveName)}`,
      label: `Use ${moveName}`,
      description: selectedPokemon ? `Attack ${selectedPokemon.species} with ${moveName}.` : undefined,
      type: 'move' as const,
      trainerId: activeTrainerBattle.trainer.id,
      trainerPokemonIndex: activeTrainerBattle.selectedPokemonIndex ?? undefined,
      moveName,
      targetHpSummary: selectedPokemonStats ? `Target HP: ${selectedPokemonStats.hp}` : undefined,
      damageSummary: damageResult?.summary ?? 'No damage',
      damageDetails: damageResult?.details,
    };
  });

  return [
    ...moveActions,
    {
      id: `${activeTrainerBattle.trainer.id}-ko-${activeTrainerBattle.selectedPokemonIndex}`,
      label: selectedPokemon ? `KO ${selectedPokemon.species} Lv. ${selectedPokemon.level}` : 'KO opposing Pokemon',
      description: selectedPokemon
        ? `Defeat ${selectedPokemon.species} and continue the trainer battle.`
        : 'Defeat the current opposing Pokemon.',
      type: 'ko',
      trainerId: activeTrainerBattle.trainer.id,
      trainerPokemonIndex: activeTrainerBattle.selectedPokemonIndex ?? undefined,
    },
  ];
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function getRouteBuilderBattleAction(
  step: RouteBuilderStep | undefined,
  battleActionId: string | undefined,
): RouteBuilderBattleAction | undefined {
  if (!step?.battle || !battleActionId) return undefined;

  return step.battle.actions.find(action => action.id === battleActionId);
}
