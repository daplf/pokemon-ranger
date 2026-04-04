import { getAvailableOptionsForStep } from '../stateManagement';
import { RouteBuilderGameConfig, RouteBuilderRouteEntry } from '../types';

const mockGameConfig: RouteBuilderGameConfig = {
  id: 'test',
  name: 'Test Game',
  startStepId: 'prereq-step',
  steps: [
    {
      id: 'prereq-step',
      name: 'Prerequisite Step',
      description: 'A step with prerequisites',
      options: [
        {
          id: 'no-prereq',
          label: 'No Prerequisites',
          targetStepId: 'next-step',
        },
        {
          id: 'trainer-prereq',
          label: 'Requires Trainer',
          targetStepId: 'next-step',
          prerequisites: {
            beatenTrainerIds: ['trainer-1'],
          },
        },
        {
          id: 'item-prereq',
          label: 'Requires Item',
          targetStepId: 'next-step',
          prerequisites: {
            excludedItems: ['Potion'],
          },
        },
      ],
    },
  ],
};

jest.mock('../gameConfig', () => ({
  getRouteBuilderStep: jest.fn((game, stepId) => game.steps.find(s => s.id === stepId)),
  getTrainerData: jest.fn(),
  getRouteBuilderPokemonData: jest.fn(() => ({ 
    growthRate: 'medium-slow',
    evYield: { hp: 1, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    learnset: [],
    baseExperience: 50
  })),
}));

jest.mock('../stateManagement', () => ({
  ...jest.requireActual('../stateManagement'),
  getDefeatedTrainerIds: jest.fn(() => []),
  getUnlockedHms: jest.fn(() => []),
}));

describe('Prerequisites', () => {
  const step = mockGameConfig.steps[0];

  it('returns options without prerequisites when no conditions are met', () => {
    const route: RouteBuilderRouteEntry[] = [];
    const options = getAvailableOptionsForStep(mockGameConfig, step, route);
    expect(options.map(o => o.id)).toEqual(['no-prereq', 'item-prereq']);
  });

  it('returns trainer prerequisite options when trainer is defeated', () => {
    const mockGetDefeatedTrainerIds = require('../stateManagement').getDefeatedTrainerIds;
    const mockGetTrainerData = require('../gameConfig').getTrainerData;
    
    mockGetDefeatedTrainerIds.mockReturnValue(['trainer-1']);
    mockGetTrainerData.mockReturnValue({ 
      id: 'trainer-1', 
      pokemon: [{
        species: 'Pidgey',
        level: 2,
        nature: 'hardy',
        evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
        ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
      }] 
    });

    const route: RouteBuilderRouteEntry[] = [
      {
        type: 'trainerBattle',
        stepId: 'prereq-step',
        trainerId: 'trainer-1',
        label: 'Battle Trainer 1',
      },
      {
        type: 'trainerBattleAction',
        stepId: 'prereq-step',
        trainerId: 'trainer-1',
        trainerPokemonIndex: 0,
        trainerBattleActionType: 'selectPokemon',
      },
      {
        type: 'trainerBattleAction',
        stepId: 'prereq-step',
        trainerId: 'trainer-1',
        trainerPokemonIndex: 0,
        trainerBattleActionType: 'ko',
      },
    ];

    const options = getAvailableOptionsForStep(mockGameConfig, step, route);
    expect(options.map(o => o.id)).toContain('trainer-prereq');
  });

  it('excludes item prerequisite options when item is in bag', () => {
    const route: RouteBuilderRouteEntry[] = [
      {
        type: 'step',
        stepId: 'prereq-step',
        arrivedViaOptionId: 'no-prereq',
        optionEffects: [
          {
            type: 'addItem',
            item: 'Potion',
            quantity: 1,
          },
        ],
      },
    ];

    const options = getAvailableOptionsForStep(mockGameConfig, step, route);
    expect(options.map(o => o.id)).not.toContain('item-prereq');
  });
});
