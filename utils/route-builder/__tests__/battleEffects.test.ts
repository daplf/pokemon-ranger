import { applyBattleActionEntry, getRouteBuilderRuntimeState, getAvailableOptionsForStep } from '../stateManagement';
import { RouteBuilderGameConfig, RouteBuilderRouteEntry, RouteBuilderRuntimeState } from '../types';

// Mock game config with battle that has effects
const mockGameConfig: RouteBuilderGameConfig = {
  id: 'bdsp-test',
  name: 'Test BDSP',
  startStepId: 'starter-chimchar',
  progressionFlags: {
    starterChosen: false,
    justFinishedStarterBattle: false,
    reachedTwinleafAfterStarter: false,
    visitedSandgemLab: false,
    talkedToMomAfterLab: false,
    completedCatchTutorial: false,
  },
  steps: [
    {
      id: 'starter-chimchar',
      name: 'Starter: Chimchar',
      description: 'You picked Chimchar as your starter Pokémon.',
      options: [
        {
          id: 'starter-chimchar-to-starly',
          label: 'Fight wild Starly Lv. 2',
          description: 'The opening forced battle after choosing Chimchar.',
          targetStepId: 'starly-battle-lv2',
        },
      ],
      effects: [
        {
          type: 'addPokemon',
          species: 'Chimchar',
          level: 5,
        },
      ],
    },
    {
      id: 'starly-battle-lv2',
      name: 'Wild Starly Lv. 2',
      description: 'The forced opening battle immediately after picking the starter.',
      options: [],
      battle: {
        opponent: {
          species: 'Starly',
          level: 2,
          nature: 'Hardy',
          evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
          ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
        },
        onKoTargetStepId: 'route-201',
        effects: [
          {
            type: 'setProgressionFlag',
            flag: 'justFinishedStarterBattle',
            value: true,
          },
        ],
      },
    },
    {
      id: 'route-201',
      name: 'Route 201',
      description: 'The first route.',
      options: [
        {
          id: 'route-201-to-lake-verity',
          label: 'Move to Lake Verity',
          description: 'Take the western path toward the lake.',
          targetStepId: 'lake-verity',
          prerequisites: {
            progressionFlags: {
              justFinishedStarterBattle: false,
            },
          },
        },
        {
          id: 'route-201-to-twinleaf',
          label: 'Move to Twinleaf Town',
          description: 'Return to the starting town.',
          targetStepId: 'twinleaf-town',
        },
      ],
    },
    {
      id: 'lake-verity',
      name: 'Lake Verity',
      description: 'One of Sinnoh\'s three lakes.',
      options: [],
    },
    {
      id: 'twinleaf-town',
      name: 'Twinleaf Town',
      description: 'A quiet starting town.',
      options: [],
    },
  ],
};

jest.mock('../gameConfig', () => ({
  getRouteBuilderStep: jest.fn((game, stepId) => game.steps.find(s => s.id === stepId)),
  getTrainerData: jest.fn(),
  getRouteBuilderPokemonData: jest.fn(() => ({
    growthRate: 'medium-slow',
    evYield: { hp: 1, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    learnset: [
      { level: 1, move: 'Scratch' },
      { level: 1, move: 'Leer' },
      { level: 7, move: 'Ember' },
    ],
    baseExperience: 50,
  })),
  getAreaTrainerList: jest.fn(() => []),
}));

jest.mock('../stateManagement', () => ({
  ...jest.requireActual('../stateManagement'),
  getDefeatedTrainerIds: jest.fn(() => []),
  getUnlockedHms: jest.fn(() => []),
}));

describe('Battle Effects', () => {
  describe('Wild Battle Effects on KO', () => {
    it('applies progression flag effects when KOing a wild battle', () => {
      // Start with Chimchar selected
      const route: RouteBuilderRouteEntry[] = [
        {
          type: 'step',
          stepId: 'starter-chimchar',
        },
        {
          type: 'step',
          stepId: 'starly-battle-lv2',
        },
      ];

      const state = getRouteBuilderRuntimeState(mockGameConfig, route);

      // Verify that justFinishedStarterBattle is false initially
      expect(state.progressionFlags?.justFinishedStarterBattle).toBe(false);

      // Now apply KO action
      const koEntry: RouteBuilderRouteEntry = {
        type: 'battleAction',
        stepId: 'starly-battle-lv2',
        battleActionId: 'ko',
      };

      const newState = applyBattleActionEntry(mockGameConfig, state, koEntry, 1);

      // Verify that justFinishedStarterBattle is now true after KO
      expect(newState.progressionFlags?.justFinishedStarterBattle).toBe(true);
    });

    it('preserves other progression flags when applying battle effects', () => {
      // Start with some progression flags set
      const route: RouteBuilderRouteEntry[] = [
        {
          type: 'step',
          stepId: 'starter-chimchar',
        },
        {
          type: 'step',
          stepId: 'starly-battle-lv2',
        },
      ];

      const state = getRouteBuilderRuntimeState(mockGameConfig, route);

      // Verify initial state
      expect(state.progressionFlags?.starterChosen).toBe(false);
      expect(state.progressionFlags?.justFinishedStarterBattle).toBe(false);

      // Apply KO action
      const koEntry: RouteBuilderRouteEntry = {
        type: 'battleAction',
        stepId: 'starly-battle-lv2',
        battleActionId: 'ko',
      };

      const newState = applyBattleActionEntry(mockGameConfig, state, koEntry, 1);

      // Verify that justFinishedStarterBattle changed
      expect(newState.progressionFlags?.justFinishedStarterBattle).toBe(true);

      // Verify that other flags remain unchanged
      expect(newState.progressionFlags?.starterChosen).toBe(false);
      expect(newState.progressionFlags?.reachedTwinleafAfterStarter).toBe(false);
      expect(newState.progressionFlags?.visitedSandgemLab).toBe(false);
    });
  });

  describe('Initialization with Progression Flags', () => {
    it('initializes state with game config progression flags', () => {
      const route: RouteBuilderRouteEntry[] = [
        {
          type: 'step',
          stepId: 'starter-chimchar',
        },
      ];

      const state = getRouteBuilderRuntimeState(mockGameConfig, route);

      // Verify that all progression flags are initialized
      expect(state.progressionFlags).toEqual({
        starterChosen: false,
        justFinishedStarterBattle: false,
        reachedTwinleafAfterStarter: false,
        visitedSandgemLab: false,
        talkedToMomAfterLab: false,
        completedCatchTutorial: false,
      });
    });
  });

  describe('Progression Flag Gating of Options', () => {
    it('shows Lake Verity option before finishing starter battle', () => {
      const route: RouteBuilderRouteEntry[] = [
        {
          type: 'step',
          stepId: 'starter-chimchar',
        },
        {
          type: 'step',
          stepId: 'starly-battle-lv2',
        },
        {
          type: 'step',
          stepId: 'route-201',
        },
      ];

      const route201Step = mockGameConfig.steps.find(s => s.id === 'route-201')!;
      const availableOptions = getAvailableOptionsForStep(mockGameConfig, route201Step, route);

      // Lake Verity should be available since justFinishedStarterBattle is false
      expect(availableOptions.map(o => o.id)).toContain('route-201-to-lake-verity');
      expect(availableOptions.map(o => o.id)).toContain('route-201-to-twinleaf');
    });

    it('hides Lake Verity option after finishing starter battle (KOing Starly)', () => {
      const route: RouteBuilderRouteEntry[] = [
        {
          type: 'step',
          stepId: 'starter-chimchar',
        },
        {
          type: 'step',
          stepId: 'starly-battle-lv2',
        },
        {
          type: 'battleAction',
          stepId: 'starly-battle-lv2',
          battleActionId: 'ko',
        },
        {
          type: 'step',
          stepId: 'route-201',
        },
      ];

      const route201Step = mockGameConfig.steps.find(s => s.id === 'route-201')!;
      const availableOptions = getAvailableOptionsForStep(mockGameConfig, route201Step, route);

      // Lake Verity should NOT be available since justFinishedStarterBattle is now true
      expect(availableOptions.map(o => o.id)).not.toContain('route-201-to-lake-verity');
      // But Twinleaf should still be available
      expect(availableOptions.map(o => o.id)).toContain('route-201-to-twinleaf');
    });
  });
});
