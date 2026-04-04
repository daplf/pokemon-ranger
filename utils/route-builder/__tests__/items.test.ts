import { applyRouteBuilderEntry } from '../stateManagement';
import { RouteBuilderGameConfig, RouteBuilderRouteEntry, RouteBuilderRuntimeState } from '../types';

const mockGameConfig: RouteBuilderGameConfig = {
  id: 'test',
  name: 'Test Game',
  startStepId: 'item-step',
  steps: [
    {
      id: 'item-step',
      name: 'Item Step',
      description: 'A step with item pickup',
      options: [
        {
          id: 'pickup-item',
          label: 'Pick up Item',
          targetStepId: 'item-step',
          effects: [
            {
              type: 'addItem',
              item: 'Potion',
              quantity: 1,
            },
          ],
        },
      ],
    },
  ],
};

jest.mock('../gameConfig', () => ({
  getRouteBuilderStep: jest.fn((game, stepId) => game.steps.find(s => s.id === stepId)),
}));

describe('Item Management', () => {
  let initialState: RouteBuilderRuntimeState;

  beforeEach(() => {
    initialState = {
      party: [],
      bag: {},
      activeTrainerBattle: null,
      currentStep: mockGameConfig.steps[0],
    };
  });

  describe('Item Pickup', () => {
    it('adds item to bag when picked up', () => {
      const pickupEntry: RouteBuilderRouteEntry = {
        type: 'step',
        stepId: 'item-step',
        arrivedViaOptionId: 'pickup-item',
        optionEffects: [
          {
            type: 'addItem',
            item: 'Potion',
            quantity: 1,
          },
        ],
      };

      const newState = applyRouteBuilderEntry(mockGameConfig, initialState, pickupEntry, 0);
      expect(newState.bag['Potion']).toBe(1);
    });

    it('accumulates quantity when picking up the same item multiple times', () => {
      let state = initialState;

      // First pickup
      state = applyRouteBuilderEntry(
        mockGameConfig,
        state,
        {
          type: 'step',
          stepId: 'item-step',
          arrivedViaOptionId: 'pickup-item',
          optionEffects: [
            {
              type: 'addItem',
              item: 'Potion',
              quantity: 1,
            },
          ],
        },
        0
      );

      // Second pickup
      state = applyRouteBuilderEntry(
        mockGameConfig,
        state,
        {
          type: 'step',
          stepId: 'item-step',
          arrivedViaOptionId: 'pickup-item',
          optionEffects: [
            {
              type: 'addItem',
              item: 'Potion',
              quantity: 1,
            },
          ],
        },
        1
      );

      expect(state.bag['Potion']).toBe(2);
    });
  });
});
