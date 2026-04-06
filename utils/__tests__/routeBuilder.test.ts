import * as routeBuilder from '../routeBuilder';

import {
  prerequisitesAreMet,
  getAvailableOptionsForStep,
  applyRouteBuilderEntry,
  buildRouteBuilderState,
  RouteBuilderGameConfig,
  RouteBuilderRouteEntry,
  RouteBuilderRuntimeState,
} from '../routeBuilder';

// Mock the config
const mockGameConfig: RouteBuilderGameConfig = {
  id: 'test',
  name: 'Test Game',
  startStepId: 'start',
  steps: [
    {
      id: 'start',
      name: 'Start',
      description: 'Starting point',
      options: [
        {
          id: 'to-step1',
          label: 'Go to Step 1',
          description: 'Move to step 1',
          targetStepId: 'step1',
        },
        {
          id: 'to-step2',
          label: 'Go to Step 2',
          description: 'Move to step 2',
          targetStepId: 'step2',
          prerequisites: {
            beatenTrainerIds: ['trainer-1'],
          },
        },
        {
          id: 'pickup-item',
          label: 'Pick up Item',
          description: 'Pick up an item',
          targetStepId: 'start',
          prerequisites: {
            excludedItems: ['Test Item'],
          },
          effects: [
            {
              type: 'addItem',
              item: 'Test Item',
              quantity: 1,
            },
          ],
        },
      ],
    },
    {
      id: 'step1',
      name: 'Step 1',
      description: 'First step',
      options: [],
    },
    {
      id: 'step2',
      name: 'Step 2',
      description: 'Second step',
      options: [],
    },
  ],
};

describe('routeBuilder', () => {
  beforeEach(() => {
    jest.spyOn(routeBuilder, 'getDefeatedTrainerIds').mockReturnValue([]);
    jest.spyOn(routeBuilder, 'getUnlockedHms').mockReturnValue([]);
    jest.spyOn(routeBuilder, 'getRouteBuilderStep').mockImplementation((game, stepId) => game.steps.find(s => s.id === stepId));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('prerequisitesAreMet', () => {
    it('returns true for no prerequisites', () => {
      const result = prerequisitesAreMet(undefined, [], [], {});
      expect(result).toBe(true);
    });
  });

  describe('getAvailableOptionsForStep', () => {
    it('returns options without prerequisites', () => {
      const step = mockGameConfig.steps[0];
      const route: RouteBuilderRouteEntry[] = [];
      const options = getAvailableOptionsForStep(mockGameConfig, step, route);
      expect(options).toHaveLength(2); // to-step1 and pickup-item
      expect(options.map(o => o.id)).toEqual(['to-step1', 'pickup-item']);
    });
  });

  describe('applyRouteBuilderEntry', () => {
    it('applies step effects', () => {
      const state: RouteBuilderRuntimeState = {
        party: [],
        bag: {},
        activeTrainerBattle: null,
      };
      const entry: RouteBuilderRouteEntry = {
        type: 'step',
        stepId: 'start',
        optionEffects: [{ type: 'addItem', item: 'Test Item', quantity: 1 }],
      };
      const newState = applyRouteBuilderEntry(mockGameConfig, state, entry, 0);
      expect(newState.bag['Test Item']).toBe(1);
    });

    it('does not reapply step effects when the same step is entered consecutively', () => {
      const initialState: RouteBuilderRuntimeState = {
        party: [],
        bag: {},
        activeTrainerBattle: null,
      };
      const firstEntry: RouteBuilderRouteEntry = {
        type: 'step',
        stepId: 'start',
        optionEffects: [{ type: 'addItem', item: 'Test Item', quantity: 1 }],
      };
      const firstState = applyRouteBuilderEntry(mockGameConfig, initialState, firstEntry, 0);

      const secondEntry: RouteBuilderRouteEntry = {
        type: 'step',
        stepId: 'start',
        arrivedViaOptionId: 'trainer-1-ko-0',
      };
      const secondState = applyRouteBuilderEntry(mockGameConfig, firstState, secondEntry, 1);

      expect(secondState.bag['Test Item']).toBe(1);
    });
  });

  describe('getRouteEntriesToUndo', () => {
    it('removes both a post-wild-battle step and the KO action when undoing', () => {
      const route: RouteBuilderRouteEntry[] = [
        { type: 'step', stepId: 'start' },
        {
          type: 'battleAction',
          stepId: 'start',
          battleActionId: 'ko',
        },
        {
          type: 'step',
          stepId: 'start',
          arrivedViaOptionId: 'ko',
        },
      ];

      expect(routeBuilder.getRouteEntriesToUndo(route)).toBe(2);
    });

    it('removes both a post-trainer-battle step and the KO action when undoing', () => {
      const route: RouteBuilderRouteEntry[] = [
        { type: 'step', stepId: 'start' },
        {
          type: 'trainerBattleAction',
          stepId: 'start',
          trainerId: 'trainer-1',
          trainerBattleActionType: 'ko',
        },
        {
          type: 'step',
          stepId: 'start',
          arrivedViaOptionId: 'trainer-1-ko-0',
        },
      ];

      expect(routeBuilder.getRouteEntriesToUndo(route)).toBe(2);
    });

    it('removes only the last entry for ordinary route actions', () => {
      const route: RouteBuilderRouteEntry[] = [
        { type: 'step', stepId: 'start' },
        { type: 'step', stepId: 'step1', arrivedViaOptionId: 'to-step1' },
      ];

      expect(routeBuilder.getRouteEntriesToUndo(route)).toBe(1);
    });
  });

  describe('buildRouteBuilderState', () => {
    it('builds state from route', () => {
      const route: RouteBuilderRouteEntry[] = [
        { type: 'step', stepId: 'start' },
        { type: 'step', stepId: 'step1', arrivedViaOptionId: 'to-step1' },
      ];
      const state = buildRouteBuilderState(mockGameConfig, route);
      expect(state.party).toHaveLength(0);
      expect(state.bag).toEqual({});
    });
  });
});
