# Route Builder Architecture & Documentation

## Overview

The Route Builder is a feature that allows users to construct custom Pokémon routes for games in the database (currently only BDSP). It tracks party composition, experience gains, item acquisition, and trainer battles.

The codebase has been refactored from a monolithic structure into a modular, maintainable architecture with clear separation of concerns.

---

## Architecture Layers

### 1. **Utilities Layer** (`utils/route-builder/`)

The utilities are organized into focused modules, each handling a specific domain:

#### `types.ts` - Type Definitions
- **Purpose**: Single source of truth for all TypeScript interfaces and types
- **Contains**:
  - Route configuration types (`RouteBuilderGameConfig`, `RouteBuilderStep`, `RouteBuilderOption`)
  - Route entry types (represents user actions taken in the route)
  - Pokemon data types (`RouteBuilderPokemonData`, `RouteBuilderPokemonInParty`)
  - Battle types (`RouteBuilderBattlePokemon`, `RouteBuilderTrainer`, etc.)
  - State types (`RouteBuilderState`, `RouteBuilderRuntimeState`)
  - Export/Import data types
- **Why Separate**: Centralizes all interfaces, making it easier to understand the data model and maintain consistency

#### `gameConfig.ts` - Game Configuration & Data Loading
- **Purpose**: Manages loading game configurations and cached data fetching
- **Key Functions**:
  - `getRouteBuilderGames()` - Get all available games
  - `getRouteBuilderGame(gameId)` - Get a specific game config
  - `getRouteBuilderStep(game, stepId)` - Get a step from a game
  - `getRouteBuilderPokemonData()` - Load and cache Pokemon data
  - `getRouteBuilderMoveData()` - Load and cache move data
  - `getTrainerData()` - Load and cache trainer data
  - `getAreaTrainerList()` - Get trainers in an area
- **Caching Strategy**: Uses Maps to cache loaded data to avoid requiring the same file multiple times
- **Import Sources**:
  - `resources/route-builder/bdsp.json` - Main game config
  - Various index JSON files for lookups
  - Dynamic requires for Pokemon/Move/Trainer/Area data files
- **Why Separate**: All game data is centralized here; changes to how data is loaded only affect this module

#### `stateManagement.ts` - Route State Building & Manipulation
- **Purpose**: Builds and manipulates the route's state (party, bag, current step)
- **Key Concepts**:
  - **Route Entry**: A single action taken by the player (visit step, use move, KO Pokemon, etc.)
  - **Runtime State**: Current state after applying all route entries (party composition, battle status, current step)
- **Key Functions**:
  - `buildRouteBuilderState(game, route)` - Calculate final party and bag from route
  - `applyRouteBuilderEntry()` - Apply a single entry to the state
  - `buildPokemonInParty()` - Create a new Pokemon with proper initialization
  - `getMovesForLevel()` - Determine which moves a Pokemon knows at a level
  - `applyExperienceToLeadPokemon()` - Grant experience to lead Pokemon and level up
  - `getCurrentRouteBuilderStep()` - Find current location
  - `getDefeatedTrainerIds()` - Track which trainers have been beaten
  - `getUnlockedHms()` - Track which HM moves have been unlocked
  - `getAvailableOptionsForStep()` - Filter step options by prerequisites
- **Why Separate**: All state calculation logic is isolated, making it easier to test different transitions and ensure state consistency

#### `battleCalculations.ts` - Battle Logic & Damage Calculations
- **Purpose**: Calculates damage, determines available battle actions, manages battle state
- **Dependencies**: Uses `relicalc` library for accurate Pokemon stat calculations
- **Key Functions**:
  - `calculateBattleDamage()` - Calculate damage range for a move
  - `calculatePokemonStats()` - Calculate final stats with EVs, IVs, nature
  - `getAvailableRouteBuilderBattleActions()` - Get valid moves for current wild battle
  - `getAvailableTrainerBattleActions()` - Get valid actions for trainer battles
  - `getActiveTrainerBattle()` - Track current trainer battle state
  - `getAvailableTrainersForStep()` - Get available trainers in current area
- **Complexity**: This module handles the most complex logic (stats calculation, type effectiveness, nature modifiers)
- **Why Separate**: Battle logic is intricate and specialized; isolating it makes it reusable and testable

#### `validation.ts` - Import/Export Validation
- **Purpose**: Validates route import files and builds export data structures
- **Key Functions**:
  - `parseRouteBuilderImport()` - Parse and validate imported JSON
  - `buildRouteExportData()` - Create standardized export format
- **Validation**:
  - Checks route file version
  - Validates all route entries exist in game config
  - Verifies step transitions are valid
  - Ensures party snapshots match route length
- **Why Separate**: Import/Export validation has specific rules and error handling logic that's independent of other concerns

#### `index.ts` - Module Re-exports
- **Purpose**: Provides convenient re-exports of all route-builder functions
- **Use**: Makes it easier to import from `utils/route-builder` without specifying sub-module paths

### 2. **Component Layer** (`components/route-builder/`)

Breaks down the page into focused, reusable components:

#### `GameSelector.tsx`
- **Props**:
  - `availableGames` - List of games user can select
  - `selectedGameId` - Currently selected game
  - `onSelectGame` - Callback when game selection changes
- **Purpose**: Game selection dropdown with help text
- **Responsibilities**:
  - Display available games
  - Handle game selection
- **Styling**: Game selection input area with label and help text

#### `CurrentPositionCard.tsx`
- **Props**:
  - `currentStep` - The step the player is currently at
  - `activeTrainerBattle` - Current trainer battle state (if in one)
  - `activeWildBattleTargetHp` - Display target HP if in wild battle
  - `activeTrainerBattleTargetHp` - Display target HP if in trainer battle
- **Purpose**: Show where the player is and what they're facing
- **Displays**:
  - Current step name and description
  - Wild battle info (species, level, HP)
  - Trainer battle info (trainer name, Pokemon facing)

#### `AvailableActionsSection.tsx`
- **Props**:
  - `isInBattle`, `isInWildBattle`, `isInTrainerBattle` - Battle state flags
  - `availableStepOptions` - Available paths to take
  - `trainersInCurrentArea` - Available trainers to battle
  - `availableBattleActions` - Available moves/actions in battle
  - Action callbacks (`onTakeOption`, `onTakeBattleAction`, etc.)
- **Purpose**: Central hub for all possible player actions
- **Behavior Changes Based On**:
  - Not in battle → Show step options and trainers
  - Wild battle → Show move and KO options
  - Trainer battle → Show Pokemon selection, moves, KO options
- **Features**:
  - Displays damage calculations for moves
  - Shows hit counters (OHKO, 2HKO, etc.)
  - Uses type effectiveness and nature calculations

#### `RouteHistorySection.tsx`
- **Props**:
  - `activeGame` - Current game config
  - `routeHistory` - Array of route history items
  - `routeListRef` - Ref for auto-scrolling
- **Purpose**: Display complete history of all actions taken
- **Shows**:
  - Main steps visited (numbered)
  - How each step was reached
  - Battle sub-actions (moves used, Pokemon defeated)
- **Auto-scrolls** to bottom as new entries are added

#### `PartySection.tsx`
- **Props**:
  - `party` - Current Pokemon party
  - `expandedExperienceRoutes` - Which Pokemon have experience expanded
  - `onToggleExperienceRoute` - Toggle expansion
- **Purpose**: Display party composition and growth
- **Shows**:
  - Pokemon species and level
  - Moves they know
  - Experience gained and level-ups
  - Can expand each Pokemon to see detailed experience history

#### `BagSection.tsx`
- **Props**:
  - `bag` - Item inventory
  - `isBagExpanded` - Whether to show items
  - `onToggleBag` - Toggle show/hide
- **Purpose**: Display collected items
- **Features**:
  - Collapsible to save space
  - Shows item name and quantity

### 3. **Page Layer** (`pages/route-builder/`)

#### `index.tsx` - Main Route Builder Page
- **Role**: Orchestrator component that ties everything together
- **Responsibilities**:
  - **State Management**: Manages all UI state
    - `selectedGameId` - Which game is selected
    - `routeSession` - Route entries and party snapshots
    - `expandedExperienceRoutes` - UI expansion state
    - `isBagExpanded` - Bag visibility
    - `importError` - Import error messages
  - **Derived State Computation**: Uses useMemo for performance
    - Computes current game, step, available options
    - Calculates battle actions and available trainers
    - Builds route history for display
  - **Event Handling**:
    - Game selection
    - Import/Export
    - Route actions (take option, use move, KO, etc.)
    - UI toggles (undo, reset, expand sections)
  - **Layout**: Two-column layout
    - Left: Actions and controls
    - Right: Party, bag, and route history

---

## Data Flow

### Route Building Flow

```
User Action (e.g., "Take Step")
  ↓
Page Handler (e.g., handleTakeOption)
  ↓
Create Route Entry (RouteBuilderRouteEntry)
  ↓
appendRouteEntry()
  ↓
applyRouteBuilderEntry() → Updates Runtime State
  ↓
buildRouteBuilderPartySnapshots() → Creates party snapshot
  ↓
Update routeSession state
  ↓
Components re-render with new state
```

### State Calculation Flow

```
Route Entries Array
  ↓
buildRouteBuilderState() or getRouteBuilderRuntimeState()
  ↓
Apply each entry sequentially:
  - applyStepEntry() → Update current step, apply effects
  - applyBattleActionEntry() → Grant experience to lead Pokemon
  - applyTrainerBattleEntry() → Initialize trainer battle
  - applyTrainerBattleActionEntry() → Progress trainer battle
  ↓
Final State (party, bag, activeTrainerBattle, currentStep)
```

### Battle Action Determination Flow

```
Current Step + Party State
  ↓
getAvailableRouteBuilderBattleActions()
  ↓
For each battle action:
  - If move type: calculateBattleDamage()
    - Load Pokemon data
    - Calculate stats with nature/EVs/IVs
    - Use relicalc for type effectiveness
    - Generate damage summary and hit count
  ↓
Return actions with damage info
```

---

## Key Design Patterns

### 1. **Immutability**
- State is never mutated directly
- All updates create new objects
- Example: `[...previousSession.route, entry]`

### 2. **Memoization**
- Expensive computations are memoized with `useMemo`
- Dependencies listed explicitly
- Example: `useMemo(() => getCurrentRouteBuilderStep(...), [activeGame, route])`

### 3. **Single Responsibility**
- Each module handles one concern
- `gameConfig.ts` - Data loading only
- `stateManagement.ts` - State building only
- `battleCalculations.ts` - Battle logic only

### 4. **Composable Components**
- Small, focused components that do one thing
- Props clearly document expected data
- Easy to test and reuse

### 5. **Type Safety**
- Comprehensive TypeScript interfaces
- No `any` types (except in a few places where unavoidable)
- Exports checked at compile time

---

## Critical Workflows

### Building a Route

1. **Select Game**: `handleSelectGame(gameId)`
   - Loads game config
   - Creates initial route entry (starting step)
   - Initializes party snapshots

2. **Take an Option**: `handleTakeOption(stepId, option)`
   - Creates step route entry with arrived-via info
   - Applies any effects (add Pokemon, items, HM moves)
   - Updates state and snapshots

3. **Wild Battle Win**: `handleTakeBattleAction(action)` (for KO)
   - Records battle action
   - Applies experience to lead Pokemon
   - Leads to next step via battle action link

4. **Trainer Battle**:
   - `handleStartTrainerBattle(trainer)` → Creates trainer battle entry
   - `handleTakeTrainerBattleAction(action)` → Records each action
     - Select Pokemon → Updates selected index
     - Use Move → Records move action
     - KO → Grants experience, removes Pokemon from available
   - When all Pokemon defeated → Battle ends, returns to normal state

### Route Editing Features

The route builder supports editing existing routes through battle action insertion, removal, and step-level undo operations. This allows users to modify battle sequences without rebuilding the entire route.

#### Battle Action Editing

**Purpose**: Insert new moves into existing battle sequences or remove unwanted actions.

**Key Components**:
- **UI Selection**: `RouteHistorySection.tsx` displays battle actions as selectable substeps
- **Insertion Logic**: `getBattleActionInsertionIndex()` in `utils/route-builder/routeEditing.ts`
- **Removal Logic**: `removeSelectedBattleActionEntry()` in `utils/route-builder/routeEditing.ts`

**Flow for Inserting a Move**:
```
User selects a battle action in RouteHistorySection
  ↓
handleSelectRouteEntry() sets selectedRouteIndex and selectedBattleActionIndex
  ↓
User chooses a new move from AvailableActionsSection
  ↓
handleTakeBattleAction() called with new action
  ↓
getBattleActionInsertionIndex() finds insertion point (after selected action)
  ↓
insertRouteEntryAtIndex() adds new battle action entry
  ↓
setSelectedBattleActionIndex() moves selection to newly inserted action
  ↓
Route history rebuilds, showing updated battle sequence
```

**Flow for Removing a Battle Action**:
```
User selects a battle action in RouteHistorySection
  ↓
handleSelectRouteEntry() sets selectedRouteIndex and selectedBattleActionIndex
  ↓
User clicks Undo
  ↓
handleUndo() detects selectedBattleActionIndex is set
  ↓
getBattleActionRouteIndex() finds the route entry to remove
  ↓
Removes entry from route and party snapshots
  ↓
Adjusts selectedBattleActionIndex to next valid action
  ↓
Route history rebuilds with updated sequence
```

#### Step-Level Undo and Gap Creation

**Purpose**: Remove entire steps from the route, creating gaps when steps cannot be directly connected.

**Key Logic**: Located in `handleUndo()` in `pages/route-builder/index.tsx`

**Flow for Step Undo**:
```
User selects a main step (not a battle action) in RouteHistorySection
  ↓
handleSelectRouteEntry() sets selectedRouteIndex, selectedBattleActionIndex = null
  ↓
User clicks Undo
  ↓
handleUndo() detects selectedBattleActionIndex is null
  ↓
Removes step entry at selectedRouteIndex from route and snapshots
  ↓
Checks if removal creates a gap:
  - Gets previous and next entries
  - Tests if they can connect via step options
  - If not connectable, sets routeGapIndex
  ↓
Moves selection to previous step
  ↓
Route history rebuilds, showing gap if created
```

**Gap Resolution**:
```
User sees gap indicator in RouteHistorySection
  ↓
User selects step before gap and chooses option that leads to step after gap
  ↓
handleTakeOption() inserts new step entry at gap position
  ↓
Gap is resolved, route becomes contiguous again
```

#### Route History Building

**Purpose**: Converts flat route entries into hierarchical display structure.

**Logic**: `routeHistory` useMemo in `pages/route-builder/index.tsx`

**Process**:
```
Iterate through route entries:
  - Step entries: Create new history item, start accumulating battle actions
  - Battle action entries: Add to current step's battleActionEntries array
  - Trainer battle entries: Similar to steps but for trainer battles
  ↓
Associate accumulated battle actions with their parent step
  ↓
Mark gap positions based on routeGapIndex
  ↓
Return array of RouteHistoryItem for display
```

**Selection Logic**:
- `selectedRouteIndex`: Index of selected history item (step/trainer)
- `selectedBattleActionIndex`: Index within battleActionEntries array
- Selection affects available actions and undo behavior

#### Utility Functions (`utils/route-builder/routeEditing.ts`)

**`getRouteHistoryItemForRouteIndex()`**: Finds history item containing a route index
**`getBattleActionRouteIndex()`**: Converts battle action selection to route entry index
**`getBattleActionInsertionIndex()`**: Determines where to insert new battle actions
**`removeSelectedBattleActionEntry()`**: Removes a battle action and returns updated route

### Validating an Import

1. User selects JSON file
2. `handleImport()` reads file
3. `parseRouteBuilderImport()` validates:
   - File version (1 or 2)
   - Game ID exists
   - All route entries valid
   - All party snapshots match entry count
4. If valid: Load route
5. If invalid: Display error message

---

## Performance Considerations

### Memoization Strategy
- Game and step lookups are memoized
- Route history computation is memoized
- Battle actions are recalculated only when needed

### Caching
- Pokemon, Move, Trainer, Area data are cached
- Prevents reloading from JSON multiple times
- Caches persist across the session

### Rendering Optimization
- Components only re-render when props change
- List renders use stable keys
- Expensive calculations are extracted to utils

---

## Extension Points

### Adding a New Game

1. Create game config JSON in `resources/route-builder/`
2. Add index entries for Pokemon, moves, trainers, areas
3. Create Pokemon/Move/Trainer/Area data files
4. Add to `GAME_CONFIGS` in `gameConfig.ts`
5. Update game selector UI (already handles new games)

### Adding a New Route Effect

1. Add new effect interface in `types.ts`
2. Handle in `applyStepEntry()` in `stateManagement.ts`
3. Handle in validation (`validation.ts`)

### Adding Route Editing Features

1. Add new editing action to `RouteBuilderBattleAction` types
2. Implement insertion logic in `routeEditing.ts`
3. Add UI handling in `AvailableActionsSection.tsx`
4. Update selection logic in `RouteHistorySection.tsx`
5. Add tests in `routeEditing.test.ts`

---

## Testing Strategy

### Unit Tests
Test individual utility functions:
- `stateManagement.ts` - Apply entry logic, state calculations
- `battleCalculations.ts` - Damage calculations
- `validation.ts` - Import validation
- `routeEditing.ts` - Battle action insertion/removal logic

### Integration Tests
Test component interactions:
- Game selection → Route initialization
- Route actions → State updates → Component re-renders
- Battle action editing → Route modification → History updates
- Step undo → Gap creation → Gap resolution

### Integration Tests
Test component interactions:
- Game selection → Route initialization
- Route actions → State updates → Component re-renders

### Manual Testing
- Import/export round-trip
- Battle progression accuracy
- Experience and level-up math

---

## Debugging Tips

1. **Check Route Valid**: `console.log(route)` - Should be array of RouteBuilderRouteEntry
2. **Check State**: `console.log(routeState)` - Should have `party` and `bag`
3. **Check Available Actions**: All `getAvailable*` functions return arrays
4. **Check Imports**: `parseRouteBuilderImport()` throws descriptive errors
5. **Battle Damage**: Check `calculateBattleDamage()` returns damage range
6. **Route Editing**:
   - Selection state: Check `selectedRouteIndex` and `selectedBattleActionIndex`
   - Insertion index: `getBattleActionInsertionIndex()` should return valid route position
   - Route history: Ensure `battleActionEntries` arrays are correctly populated
   - Gap detection: Check `routeGapIndex` when steps are removed

---

## Dependencies

### External Libraries
- **relicalc**: Pokemon stat calculation and move effectiveness
- **react-dropzone**: File upload handling
- **styled-components**: Component styling

### Internal Dependencies
- Games reference calculation utilities from `utils/calculations.ts`
- Battle logic uses relicalc for type effectiveness
- Components import from multiple utility modules

---

## File Structure Summary

```
utils/route-builder/
├── types.ts                    # All TypeScript interfaces
├── gameConfig.ts              # Game data loading and caching
├── stateManagement.ts         # Route state calculations
├── battleCalculations.ts      # Battle logic and damage
├── validation.ts              # Import/export validation
├── routeEditing.ts            # Battle action editing utilities
├── __tests__/
│   ├── routeEditing.test.ts   # Tests for editing utilities
│   └── ...                    # Other test files
└── index.ts                   # Convenience re-exports

components/route-builder/
├── GameSelector.tsx           # Game selection component
├── CurrentPositionCard.tsx    # Current step display
├── AvailableActionsSection.tsx # Action options
├── RouteHistorySection.tsx    # History display
├── PartySection.tsx           # Party display
├── BagSection.tsx             # Bag display
└── index.ts                   # Component re-exports

pages/route-builder/
└── index.tsx                  # Main page orchestrator

utils/
└── routeBuilder.ts            # Backward compatibility re-exports
```

---

## Next Steps for Enhancement

1.  **Multi-game Support**: Once more games are ready, the architecture supports them without changes
2. **Save/Load Routes**: Extend validation to support different save formats
3. **Route Templates**: Create common routes as starting points
4. **Better UX**: Add more visual feedback for current choices
5. **Route Optimizer**: Suggest optimal routes for game objectives
6. **Mobile View**: Adapt two-column layout for smaller screens
