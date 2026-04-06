import { applyBattleActionEntry, applyTrainerBattleActionEntry } from '../stateManagement';
import { RouteBuilderGameConfig, RouteBuilderRouteEntry, RouteBuilderRuntimeState, RouteBuilderTrainer } from '../types';

// Mock game config with battle
const mockGameConfig: RouteBuilderGameConfig = {
  id: 'test',
  name: 'Test Game',
  startStepId: 'battle-step',
  steps: [
    {
      id: 'battle-step',
      name: 'Battle',
      description: 'A battle step',
      options: [],
      battle: {
        actions: [
          { id: 'scratch', label: 'Scratch', type: 'move' },
          { id: 'ko', label: 'KO', type: 'ko' },
        ],
        onKoTargetStepId: 'next-step',
        opponent: {
          species: 'Pidgey',
          level: 2,
          nature: 'hardy',
          evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
          ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
        },
      },
    },
  ],
};

const mockTrainerData: RouteBuilderTrainer = {
  id: 'trainer-1',
  name: 'Trainer',
  pokemon: [
    {
      species: 'Pidgey',
      level: 2,
      nature: 'hardy',
      evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
      moves: ['Tackle'],
    },
  ],
  trainerId: 1,
  game: 'bdsp',
};

jest.mock('../gameConfig', () => ({
  getRouteBuilderStep: jest.fn((game: RouteBuilderGameConfig, stepId: string) => game.steps.find(s => s.id === stepId)),
  getTrainerData: jest.fn(() => mockTrainerData),
  getRouteBuilderPokemonData: jest.fn(() => ({
    growthRate: 'medium-slow',
    evYield: { hp: 1, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    learnset: [],
    baseExperience: 50,
  })),
}));

describe('Experience and EV Gain', () => {
  let initialState: RouteBuilderRuntimeState;

  beforeEach(() => {
    initialState = {
      party: [
        {
          species: 'Chimchar',
          initialLevel: 5,
          level: 5,
          growthRate: 'medium-slow',
          nature: 'hardy',
          evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
          ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
          hasRandomIvs: false,
          moves: ['Scratch'],
          experienceEvents: [],
          experienceRoute: [],
        },
      ],
      bag: {},
      activeTrainerBattle: null,
      currentStep: mockGameConfig.steps[0],
    };
  });

  describe('Wild Battles', () => {
    it('does not grant experience when using a move', () => {
      const moveEntry: RouteBuilderRouteEntry = {
        type: 'battleAction',
        stepId: 'battle-step',
        battleActionId: 'scratch',
      };

      const newState = applyBattleActionEntry(mockGameConfig, initialState, moveEntry, 0);
      expect(newState.party[0].experienceEvents).toHaveLength(0);
    });

    it('grants experience when KOing the opponent', () => {
      const koEntry: RouteBuilderRouteEntry = {
        type: 'battleAction',
        stepId: 'battle-step',
        battleActionId: 'ko',
      };

      const newState = applyBattleActionEntry(mockGameConfig, initialState, koEntry, 0);
      expect(newState.party[0].experienceEvents).toHaveLength(1);
      expect(newState.party[0].experienceEvents[0].id).toBe('wild-0');
    });
  });

  describe('Trainer Battles', () => {
    beforeEach(() => {
      initialState.activeTrainerBattle = {
        trainer: mockTrainerData,
        defeatedPokemonIndexes: [],
        selectedPokemonIndex: 0,
      };
    });

    it('does not grant experience when using a move', () => {
      const moveEntry: RouteBuilderRouteEntry = {
        type: 'trainerBattleAction',
        stepId: 'battle-step',
        trainerId: 'trainer-1',
        trainerPokemonIndex: 0,
        trainerBattleActionType: 'move',
      };

      const newState = applyTrainerBattleActionEntry(mockGameConfig, initialState, moveEntry, 0);
      expect(newState.party[0].experienceEvents).toHaveLength(0);
    });

    it('grants experience when KOing the opponent', () => {
      const koEntry: RouteBuilderRouteEntry = {
        type: 'trainerBattleAction',
        stepId: 'battle-step',
        trainerId: 'trainer-1',
        trainerPokemonIndex: 0,
        trainerBattleActionType: 'ko',
      };

      const newState = applyTrainerBattleActionEntry(mockGameConfig, initialState, koEntry, 0);
      expect(newState.party[0].experienceEvents).toHaveLength(1);
      expect(newState.party[0].experienceEvents[0].id).toBe('trainer-trainer-1-0');
    });
  });
});
