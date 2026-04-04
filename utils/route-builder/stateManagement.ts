import { buildExperienceRoute, ExperienceEvent, SpeciesExperienceEvent } from '../calculations';
import {
  RouteBuilderGameConfig,
  RouteBuilderRouteEntry,
  RouteBuilderStep,
  RouteBuilderState,
  RouteBuilderRuntimeState,
  RouteBuilderPokemonInParty,
  RouteBuilderStatSpread,
  RouteBuilderBattlePokemon,
  RouteBuilderPrerequisites,
  RouteBuilderHm,
  RouteBuilderStepEffect,
} from './types';
import { getRouteBuilderPokemonData, getTrainerData, getAreaTrainerList, getRouteBuilderGame, getRouteBuilderStep } from './gameConfig';

const DEFAULT_EV_SPREAD: RouteBuilderStatSpread = {
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

const BDSP_EXPERIENCE_GENERATION = 7;

/**
 * Gets the current step in a route based on the most recent 'step' type entry
 */
export function getCurrentRouteBuilderStep(
  game: RouteBuilderGameConfig,
  route: RouteBuilderRouteEntry[],
): RouteBuilderStep | undefined {
  const currentEntry = [...route].reverse().find(entry => entry.type === 'step');

  if (!currentEntry) return undefined;

  return getRouteBuilderStep(game, currentEntry.stepId);
}

/**
 * Builds the initial route for a game (starting at the game's configured start step)
 */
export function buildInitialRoute(game: RouteBuilderGameConfig): RouteBuilderRouteEntry[] {
  return [{
    type: 'step',
    stepId: game.startStepId,
  }];
}

/**
 * Builds a route state by applying all route entries in sequence
 */
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

/**
 * Gets the full runtime state including current step and active battles
 */
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

/**
 * Applies a single route entry to the runtime state, updating party, bag, and battle status
 */
export function applyRouteBuilderEntry(
  game: RouteBuilderGameConfig,
  state: RouteBuilderRuntimeState,
  entry: RouteBuilderRouteEntry,
  index: number,
): RouteBuilderRuntimeState {
  if (entry.type === 'step') {
    return applyStepEntry(game, state, entry);
  }

  if (entry.type === 'battleAction') {
    return applyBattleActionEntry(game, state, entry, index);
  }

  if (entry.type === 'trainerBattle') {
    return applyTrainerBattleEntry(game, state, entry);
  }

  if (entry.type === 'trainerBattleAction') {
    return applyTrainerBattleActionEntry(game, state, entry, index);
  }

  return state;
}

/**
 * Applies a step entry, updating current step and applying any step effects
 */
function applyStepEntry(
  game: RouteBuilderGameConfig,
  state: RouteBuilderRuntimeState,
  entry: RouteBuilderRouteEntry,
): RouteBuilderRuntimeState {
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

/**
 * Applies a battle action entry (wild or trainer), dealing experience if KO
 */
export function applyBattleActionEntry(
  game: RouteBuilderGameConfig,
  state: RouteBuilderRuntimeState,
  entry: RouteBuilderRouteEntry,
  index: number,
): RouteBuilderRuntimeState {
  if (!state.currentStep?.battle?.opponent || !entry.battleActionId) return state;

  const action = state.currentStep.battle.actions.find(a => a.id === entry.battleActionId);
  if (!action || action.type !== 'ko') return state;

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

/**
 * Applies a trainer battle entry, initializing the active trainer battle
 */
function applyTrainerBattleEntry(
  game: RouteBuilderGameConfig,
  state: RouteBuilderRuntimeState,
  entry: RouteBuilderRouteEntry,
): RouteBuilderRuntimeState {
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

/**
 * Applies a trainer battle action entry (selecting Pokemon, using move, or KO)
 */
export function applyTrainerBattleActionEntry(
  game: RouteBuilderGameConfig,
  state: RouteBuilderRuntimeState,
  entry: RouteBuilderRouteEntry,
  index: number,
): RouteBuilderRuntimeState {
  if (!state.activeTrainerBattle) return state;

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

  return state;
}

/**
 * Builds party snapshots for all route entries (state of party at each step)
 */
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

/**
 * Deep clones a party state
 */
export function clonePartyState(party: RouteBuilderPokemonInParty[]): RouteBuilderPokemonInParty[] {
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

/**
 * Hydrates a single Pokemon's move list if empty
 */
function hydratePokemonPartyState(gameId: string, pokemon: RouteBuilderPokemonInParty): RouteBuilderPokemonInParty {
  if (pokemon.moves.length > 0) return pokemon;

  return {
    ...pokemon,
    moves: getMovesForLevel(gameId, pokemon.species, pokemon.level),
  };
}

/**
 * Hydrates a party's move lists if empty
 */
function hydratePartyState(gameId: string, party: RouteBuilderPokemonInParty[]): RouteBuilderPokemonInParty[] {
  return party.map(pokemon => hydratePokemonPartyState(gameId, pokemon));
}

/**
 * Hydrates party snapshots with move lists
 */
export function hydrateRouteBuilderPartySnapshots(
  gameId: string,
  partySnapshots: RouteBuilderPokemonInParty[][],
): RouteBuilderPokemonInParty[][] {
  return partySnapshots.map(partySnapshot => hydratePartyState(gameId, clonePartyState(partySnapshot)));
}

/**
 * Gets moves available at a specific level for a Pokemon
 */
export function getMovesForLevel(gameId: string, species: string, level: number): string[] {
  const pokemon = getRouteBuilderPokemonData(gameId, species);

  if (!pokemon) return [];

  return pokemon.learnset
    .filter(entry => entry.level <= level)
    .map(entry => entry.move)
    .slice(-4);
}

/**
 * Creates a new Pokemon in the party at a given level
 */
export function buildPokemonInParty(gameId: string, species: string, level: number): RouteBuilderPokemonInParty {
  const pokemonData = getRouteBuilderPokemonData(gameId, species);

  return {
    species,
    initialLevel: level,
    level,
    growthRate: pokemonData?.growthRate ?? 'medium-fast',
    nature: 'hardy',
    evs: { ...DEFAULT_EV_SPREAD },
    ivs: { ...DEFAULT_IV_SPREAD },
    hasRandomIvs: true,
    moves: getMovesForLevel(gameId, species, level),
    experienceEvents: [],
    experienceRoute: [],
  };
}

/**
 * Applies experience to the lead Pokemon from defeating an opponent
 */
export function applyExperienceToLeadPokemon(
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

/**
 * Builds an experience event from defeated Pokemon data
 */
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

/**
 * Converts EV array to stat spread object
 */
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

/**
 * Gets defeated trainer IDs from route history
 */
export function getDefeatedTrainerIds(
  gameId: string,
  route: RouteBuilderRouteEntry[],
): string[] {
  const defeatedTrainerIds = new Set<string>();

  route.reduce<any>((activeBattle, entry) => {
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

/**
 * Gets unlocked HMs from route history
 */
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

/**
 * Gets unlocked HMs by game ID
 */
function getUnlockedHmsByGameId(gameId: string, route: RouteBuilderRouteEntry[]): RouteBuilderHm[] {
  const game = getRouteBuilderGame(gameId);

  if (!game) return [];

  return getUnlockedHms(game, route);
}

/**
 * Gets available options for a step (filters by prerequisites)
 */
export function getAvailableOptionsForStep(
  game: RouteBuilderGameConfig,
  step: RouteBuilderStep,
  route: RouteBuilderRouteEntry[],
) {
  const beatenTrainerIds = getDefeatedTrainerIds(game.id, route);
  const unlockedHms = getUnlockedHms(game, route);
  const bag = buildRouteBuilderState(game, route).bag;

  return step.options.filter(option => prerequisitesAreMet(option.prerequisites, beatenTrainerIds, unlockedHms, bag));
}

/**
 * Checks if prerequisites are met
 */
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

/**
 * Helper: converts trainer Pokemon to battle Pokemon
 */
export function asBattlePokemon(pokemon: any): RouteBuilderBattlePokemon {
  return {
    species: pokemon.species,
    level: pokemon.level,
    nature: pokemon.nature ?? 'Hardy',
    evs: pokemon.evs,
    ivs: pokemon.ivs,
  };
}

/**
 * Gets a specific battle action from a step by ID
 */
export function getRouteBuilderBattleAction(
  step: RouteBuilderStep | undefined,
  battleActionId: string | undefined,
) {
  if (!step?.battle || !battleActionId) return undefined;

  return step.battle.actions.find(action => action.id === battleActionId);
}
