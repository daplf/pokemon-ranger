// Types
export * from './types';

// Game Configuration & Data Loading
export {
  getRouteBuilderGames,
  getRouteBuilderGame,
  getRouteBuilderStep,
  getRouteBuilderPokemonData,
  getRouteBuilderMoveData,
  getRouteBuilderItemData,
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
  getAvailableBagItems,
  prerequisitesAreMet,
  asBattlePokemon,
  getRouteBuilderBattleAction,
  getRouteEntriesToUndo,
} from './stateManagement';

// Battle Calculations
export {
  getActiveTrainerBattle,
  getAvailableTrainersForStep,
  getAvailableRouteBuilderBattleActions,
  getAvailableTrainerBattleActions,
} from './battleCalculations';

// Editing helpers
export {
  getRouteHistoryItemForRouteIndex,
  getBattleActionRouteIndex,
  getBattleActionInsertionIndex,
  removeSelectedBattleActionEntry,
  removeSelectedBattleEntry,
} from './routeEditing';

// Validation & Import/Export
export {
  parseRouteBuilderImport,
  buildRouteExportData,
} from './validation';
