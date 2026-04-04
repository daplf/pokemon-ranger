// Types
export * from './types';

// Game Configuration & Data Loading
export {
  getRouteBuilderGames,
  getRouteBuilderGame,
  getRouteBuilderStep,
  getRouteBuilderPokemonData,
  getRouteBuilderMoveData,
  getAreaTrainerList,
  getTrainerData,
  getTrainersForStep,
} from './gameConfig';

// State Management
export {
  getCurrentRouteBuilderStep,
  buildInitialRoute,
  buildRouteBuilderState,
  getRouteBuilderRuntimeState,
  applyRouteBuilderEntry,
  applyBattleActionEntry,
  applyTrainerBattleActionEntry,
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
} from './stateManagement';

// Battle Calculations
export {
  getActiveTrainerBattle,
  getAvailableTrainersForStep,
  getAvailableRouteBuilderBattleActions,
  getAvailableTrainerBattleActions,
} from './battleCalculations';

// Validation & Import/Export
export {
  parseRouteBuilderImport,
  buildRouteExportData,
} from './validation';
