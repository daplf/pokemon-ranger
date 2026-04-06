import {
  RouteBuilderExportData,
  RouteBuilderRouteEntry,
  RouteBuilderStep,
} from './types';
import {
  getRouteBuilderGame,
  getRouteBuilderStep,
  getTrainerData,
} from './gameConfig';
import { getRouteBuilderBattleAction } from './stateManagement';

/**
 * Validates and parses imported route JSON data
 */
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

  // Validate all route entries
  validateRouteEntries(game, route);

  // Validate party snapshots if version 2
  if (version === 2) {
    validatePartySnapshots(data as RouteBuilderExportData);

    return {
      version,
      gameId,
      route,
      partySnapshots: (data as RouteBuilderExportData).partySnapshots,
    };
  }

  return {
    version,
    gameId,
    route,
  };
}

/**
 * Validates all route entries for correctness
 */
function validateRouteEntries(game: any, route: RouteBuilderRouteEntry[]): void {
  let currentStep: RouteBuilderStep | undefined;
  let activeTrainerBattle: any = null;
  let selectedTrainerPokemonIndex: number | null = null;

  route.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Route entry ${index + 1} is invalid.`);
    }

    if (typeof entry.stepId !== 'string' || entry.stepId.length === 0) {
      throw new Error(`Route entry ${index + 1} is missing a valid step id.`);
    }

    if (entry.type === 'step') {
      const previousRouteEntry = index > 0 ? route[index - 1] : undefined;
      validateStepEntry(game, entry, index, currentStep, previousRouteEntry);
      currentStep = getRouteBuilderStep(game, entry.stepId);
      activeTrainerBattle = null;
      selectedTrainerPokemonIndex = null;
      return;
    }

    if (entry.type === 'battleAction') {
      validateBattleActionEntry(currentStep, entry, index);
      return;
    }

    if (entry.type === 'trainerBattle') {
      validateTrainerBattleEntry(game, entry, index);
      activeTrainerBattle = entry.trainerId ? getTrainerData(game.id, entry.trainerId) : undefined;
      selectedTrainerPokemonIndex = null;
      return;
    }

    if (entry.type === 'trainerBattleAction') {
      validateTrainerBattleActionEntry(activeTrainerBattle, entry, index, selectedTrainerPokemonIndex);

      if (entry.trainerBattleActionType === 'selectPokemon') {
        selectedTrainerPokemonIndex = entry.trainerPokemonIndex ?? null;
      } else if (entry.trainerBattleActionType === 'ko') {
        selectedTrainerPokemonIndex = null;
      }

      return;
    }

    if (entry.type === 'itemUsage') {
      validateItemUsageEntry(entry, index);
      return;
    }

    throw new Error(`Route entry ${index + 1} has an unsupported type.`);
  });
}

/**
 * Validates a single step entry
 */
function validateStepEntry(
  game: any,
  entry: RouteBuilderRouteEntry,
  index: number,
  previousStep: RouteBuilderStep | undefined,
  previousRouteEntry: RouteBuilderRouteEntry | undefined,
): void {
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

    validateStepTransition(previousStep, entry, previousRouteEntry);
  }
}

/**
 * Validates that a step transition is valid
 */
function validateStepTransition(
  previousStep: RouteBuilderStep | undefined,
  entry: RouteBuilderRouteEntry,
  previousRouteEntry: RouteBuilderRouteEntry | undefined,
): void {
  const matchingOption = previousStep?.options.find(option => option.id === entry.arrivedViaOptionId);

  if (matchingOption) {
    if (matchingOption.targetStepId !== entry.stepId) {
      throw new Error('Route entry does not match the selected step transition.');
    }
  } else {
    const matchingBattleAction = getRouteBuilderBattleAction(previousStep, entry.arrivedViaOptionId);

    if (matchingBattleAction?.type === 'ko' && previousStep?.battle?.onKoTargetStepId === entry.stepId) {
      return;
    }

    if (
      previousRouteEntry?.type === 'trainerBattleAction'
      && previousRouteEntry.trainerBattleActionType === 'ko'
      && entry.stepId === previousStep?.id
    ) {
      return;
    }

    throw new Error('Route entry does not match a valid route transition.');
  }
}

/**
 * Validates a battle action entry
 */
function validateBattleActionEntry(
  step: RouteBuilderStep | undefined,
  entry: RouteBuilderRouteEntry,
  index: number,
): void {
  const action = getRouteBuilderBattleAction(step, entry.battleActionId);

  if (!action) {
    throw new Error(`Route entry ${index + 1} references an unknown battle action.`);
  }
}

/**
 * Validates a trainer battle entry
 */
function validateTrainerBattleEntry(game: any, entry: RouteBuilderRouteEntry, index: number): void {
  const trainer = entry.trainerId ? getTrainerData(game.id, entry.trainerId) : undefined;

  if (!trainer) {
    throw new Error(`Route entry ${index + 1} references an unknown trainer.`);
  }
}

/**
 * Validates a trainer battle action entry
 */
function validateTrainerBattleActionEntry(
  activeTrainerBattle: any,
  entry: RouteBuilderRouteEntry,
  index: number,
  selectedTrainerPokemonIndex: number | null,
): void {
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

    return;
  }

  if (entry.trainerBattleActionType === 'move' || entry.trainerBattleActionType === 'ko') {
    if (selectedTrainerPokemonIndex === null) {
      throw new Error(`Route entry ${index + 1} tries to perform an action on a trainer Pokemon before selecting one.`);
    }

    return;
  }

  if (entry.trainerBattleActionType === 'item') {
    return;
  }

  throw new Error(`Route entry ${index + 1} has an unsupported trainer battle action.`);
}

/**
 * Validates an item usage entry
 */
function validateItemUsageEntry(entry: RouteBuilderRouteEntry, index: number): void {
  if (typeof entry.itemName !== 'string' || entry.itemName.length === 0) {
    throw new Error(`Route entry ${index + 1} is missing a valid item name.`);
  }

  if (typeof entry.targetPokemonIndex !== 'number' || entry.targetPokemonIndex < 0) {
    throw new Error(`Route entry ${index + 1} is missing a valid target pokemon index.`);
  }
}

/**
 * Validates party snapshots in version 2 routes
 */
function validatePartySnapshots(data: RouteBuilderExportData): void {
  if (!Array.isArray(data.partySnapshots)) {
    throw new Error('Route file is missing party snapshots.');
  }

  const partySnapshots = data.partySnapshots ?? [];

  if (partySnapshots.length !== data.route.length) {
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
}

/**
 * Builds export data for routes (format standardized for saves)
 */
export function buildRouteExportData(
  gameId: string,
  route: RouteBuilderRouteEntry[],
  partySnapshots: any[][],
): RouteBuilderExportData {
  return {
    version: 2,
    gameId,
    route,
    partySnapshots,
  };
}
