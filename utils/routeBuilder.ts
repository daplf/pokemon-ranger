/**
 * routeBuilder.ts - Backward Compatibility Layer
 *
 * This file re-exports all functionality from the refactored route-builder modules.
 * It allows existing code to continue importing from 'utils/routeBuilder' while
 * the actual implementation has been moved to 'utils/route-builder/' with proper separation of concerns.
 */

// Re-export all types
export * from './route-builder/types';

// Re-export all game configuration functions
export {
  getRouteBuilderGames,
  getRouteBuilderGame,
  getRouteBuilderStep,
  getRouteBuilderPokemonData,
  getRouteBuilderMoveData,
  getAreaTrainerList,
  getTrainerData,
  getTrainersForStep,
} from './route-builder/gameConfig';

// Re-export all state management functions
export {
  getCurrentRouteBuilderStep,
  buildInitialRoute,
  buildRouteBuilderState,
  getRouteBuilderRuntimeState,
  applyRouteBuilderEntry,
  buildRouteBuilderPartySnapshots,
  clonePartyState,
  hydrateRouteBuilderPartySnapshots,
  getMovesForLevel,
  buildPokemonInParty,
  applyExperienceToLeadPokemon,
  getDefeatedTrainerIds,
  getUnlockedHms,
  getAvailableOptionsForStep,
  prerequisitesAreMet,
  asBattlePokemon,
  getRouteBuilderBattleAction,
  getRouteEntriesToUndo,
} from './route-builder/stateManagement';

// Re-export all battle calculation functions
export {
  getActiveTrainerBattle,
  getAvailableTrainersForStep,
  getAvailableRouteBuilderBattleActions,
  getAvailableTrainerBattleActions,
} from './route-builder/battleCalculations';

// Re-export all validation functions
export {
  parseRouteBuilderImport,
  buildRouteExportData,
} from './route-builder/validation';
