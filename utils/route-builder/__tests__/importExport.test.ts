import { parseRouteBuilderImport } from '../validation';
import { RouteBuilderGameConfig } from '../types';

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
          id: 'to-battle',
          label: 'Go to Battle',
          targetStepId: 'battle-step',
        },
      ],
    },
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
        onKoTargetStepId: 'after-battle',
        opponent: {
          species: 'Pidgey',
          level: 2,
          nature: 'hardy',
          evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
          ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
        },
      },
    },
    {
      id: 'after-battle',
      name: 'After Battle',
      description: 'Post battle',
      options: [],
    },
  ],
};

const mockTrainerData = {
  id: 'trainer-1',
  name: 'Trainer',
  pokemon: [
    {
      species: 'Pidgey',
      level: 2,
      nature: 'hardy',
      evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
    },
  ],
};

jest.mock('../gameConfig', () => ({
  getRouteBuilderGame: jest.fn(() => mockGameConfig),
  getRouteBuilderStep: jest.fn((game: RouteBuilderGameConfig, stepId: string) => game.steps.find(s => s.id === stepId)),
  getTrainerData: jest.fn(() => mockTrainerData),
}));

describe('Import/Export', () => {
  it('successfully imports a complex route with battles and items', () => {
    const complexRouteData = {
      version: 1 as const,
      gameId: 'test',
      route: [
        { type: 'step' as const, stepId: 'start' },
        {
          type: 'step' as const,
          stepId: 'battle-step',
          arrivedViaOptionId: 'to-battle',
        },
        {
          type: 'battleAction' as const,
          stepId: 'battle-step',
          battleActionId: 'scratch',
        },
        {
          type: 'battleAction' as const,
          stepId: 'battle-step',
          battleActionId: 'ko',
        },
        {
          type: 'step' as const,
          stepId: 'after-battle',
          arrivedViaOptionId: 'ko',
        },
        {
          type: 'trainerBattle' as const,
          stepId: 'after-battle',
          trainerId: 'trainer-1',
          label: 'Battle Trainer',
        },
        {
          type: 'trainerBattleAction' as const,
          stepId: 'after-battle',
          trainerId: 'trainer-1',
          trainerPokemonIndex: 0,
          trainerBattleActionType: 'selectPokemon' as const,
        },
        {
          type: 'trainerBattleAction' as const,
          stepId: 'after-battle',
          trainerId: 'trainer-1',
          trainerPokemonIndex: 0,
          trainerBattleActionType: 'move' as const,
        },
        {
          type: 'trainerBattleAction' as const,
          stepId: 'after-battle',
          trainerId: 'trainer-1',
          trainerPokemonIndex: 0,
          trainerBattleActionType: 'ko' as const,
        },
      ],
    };

    expect(() => parseRouteBuilderImport(complexRouteData)).not.toThrow();
    const imported = parseRouteBuilderImport(complexRouteData);
    expect(imported.route).toHaveLength(9);
    expect(imported.gameId).toBe('test');
  });

  it('accepts a post-trainer-battle step entry after a KO action', () => {
    const trainerRoute = {
      version: 1 as const,
      gameId: 'test',
      route: [
        { type: 'step' as const, stepId: 'start' },
        {
          type: 'trainerBattle' as const,
          stepId: 'start',
          trainerId: 'trainer-1',
          label: 'Battle Trainer',
        },
        {
          type: 'trainerBattleAction' as const,
          stepId: 'start',
          trainerId: 'trainer-1',
          trainerPokemonIndex: 0,
          trainerBattleActionType: 'selectPokemon',
        },
        {
          type: 'trainerBattleAction' as const,
          stepId: 'start',
          trainerId: 'trainer-1',
          trainerPokemonIndex: 0,
          trainerBattleActionType: 'ko',
        },
        {
          type: 'step' as const,
          stepId: 'start',
          arrivedViaOptionId: 'trainer-1-ko-0',
        },
      ],
    };

    expect(() => parseRouteBuilderImport(trainerRoute)).not.toThrow();
  });

  it('validates route structure and throws on invalid data', () => {
    const invalidRouteData = {
      version: 1 as const,
      gameId: 'test',
      route: [
        { type: 'invalid', stepId: 'start' },
      ],
    };

    expect(() => parseRouteBuilderImport(invalidRouteData)).toThrow('Route entry 1 has an unsupported type.');
  });

  it('validates trainer battle actions require selection first', () => {
    const invalidTrainerRoute = {
      version: 1 as const,
      gameId: 'test',
      route: [
        { type: 'step' as const, stepId: 'start' },
        {
          type: 'trainerBattle' as const,
          stepId: 'start',
          trainerId: 'trainer-1',
        },
        {
          type: 'trainerBattleAction' as const,
          stepId: 'start',
          trainerId: 'trainer-1',
          trainerPokemonIndex: 0,
          trainerBattleActionType: 'move' as const, // Trying to move without selecting
        },
      ],
    };

    expect(() => parseRouteBuilderImport(invalidTrainerRoute)).toThrow('Route entry 3 tries to perform an action on a trainer Pokemon before selecting one.');
  });
});
