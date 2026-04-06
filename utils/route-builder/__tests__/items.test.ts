import { applyRouteBuilderEntry, getAvailableOptionsForStep } from '../stateManagement';
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
  getRouteBuilderStep: jest.fn((game: RouteBuilderGameConfig, stepId: string) => game.steps.find(s => s.id === stepId)),
  getRouteBuilderItemData: jest.fn((gameId, itemName) => ({
    name: itemName,
    game: gameId,
    category: 'medicine',
    canUseInBattle: true,
    canUseOutsideBattle: true,
    effects: [{ type: 'heal', value: 20, description: 'Restores 20 HP' }],
  })),
  getRouteBuilderPokemonData: jest.fn((gameId, species) => ({
    species,
    game: gameId,
    types: ['grass'],
    growthRate: 'medium-fast',
    baseExperience: 100,
    evYield: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    baseStats: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    learnset: [],
  })),
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
      expect(newState.bag.Potion).toBe(1);
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
        0,
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
        1,
      );

      expect(state.bag.Potion).toBe(2);
    });
  });

  describe('Item Usage', () => {
    it('consumes an item when used', () => {
      const state: RouteBuilderRuntimeState = {
        party: [{
          species: 'Turtwig',
          initialLevel: 5,
          level: 5,
          growthRate: 'medium-fast',
          nature: 'hardy',
          evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
          ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
          hasRandomIvs: true,
          moves: [],
          experienceEvents: [],
          experienceRoute: [],
        }],
        bag: { Potion: 2 },
        activeTrainerBattle: null,
        currentStep: mockGameConfig.steps[0],
      };

      const newState = applyRouteBuilderEntry(mockGameConfig, state, {
        type: 'itemUsage',
        stepId: 'item-step',
        itemName: 'Potion',
        targetPokemonIndex: 0,
        label: 'Used Potion on Turtwig',
      }, 0);

      expect(newState.bag.Potion).toBe(1);
    });

    it('removes item from bag when quantity reaches zero', () => {
      const state: RouteBuilderRuntimeState = {
        party: [{
          species: 'Turtwig',
          initialLevel: 5,
          level: 5,
          growthRate: 'medium-fast',
          nature: 'hardy',
          evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
          ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
          hasRandomIvs: true,
          moves: [],
          experienceEvents: [],
          experienceRoute: [],
        }],
        bag: { Potion: 1 },
        activeTrainerBattle: null,
        currentStep: mockGameConfig.steps[0],
      };

      const newState = applyRouteBuilderEntry(mockGameConfig, state, {
        type: 'itemUsage',
        stepId: 'item-step',
        itemName: 'Potion',
        targetPokemonIndex: 0,
        label: 'Used Potion on Turtwig',
      }, 0);

      expect(newState.bag.Potion).toBeUndefined();
      expect(newState.bag).toEqual({});
    });
  });

  describe('Item Option Availability', () => {
    const itemRouteConfig: RouteBuilderGameConfig = {
      id: 'test',
      name: 'Item Use Test',
      startStepId: 'item-step',
      steps: [
        {
          id: 'item-step',
          name: 'Item Step',
          description: 'A step that allows item usage',
          options: [],
          effects: [
            {
              type: 'addPokemon',
              species: 'Turtwig',
              level: 5,
            },
          ],
        },
      ],
    };

    it('shows a default Use Item option when the bag has usable items', () => {
      const route: RouteBuilderRouteEntry[] = [
        {
          type: 'step',
          stepId: 'item-step',
          optionEffects: [
            {
              type: 'addItem',
              item: 'Potion',
              quantity: 1,
            },
          ],
        },
      ];

      const options = getAvailableOptionsForStep(itemRouteConfig, itemRouteConfig.steps[0], route);
      expect(options.some(option => option.id === 'use-item')).toBe(true);
    });

    it('does not show Use Item when item usage is disabled on the step', () => {
      const disabledStepConfig: RouteBuilderGameConfig = {
        ...itemRouteConfig,
        steps: [
          {
            ...itemRouteConfig.steps[0],
            disableItemUsage: true,
          },
        ],
      };

      const route: RouteBuilderRouteEntry[] = [
        {
          type: 'step',
          stepId: 'item-step',
          optionEffects: [
            {
              type: 'addItem',
              item: 'Potion',
              quantity: 1,
            },
          ],
        },
      ];

      const options = getAvailableOptionsForStep(disabledStepConfig, disabledStepConfig.steps[0], route);
      expect(options.some(option => option.id === 'use-item')).toBe(false);
    });
  });
});
