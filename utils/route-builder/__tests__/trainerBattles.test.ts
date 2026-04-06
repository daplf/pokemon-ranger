import { applyTrainerBattleActionEntry } from '../stateManagement';
import { RouteBuilderGameConfig, RouteBuilderRouteEntry, RouteBuilderRuntimeState, RouteBuilderTrainer } from '../types';

const mockGameConfig: RouteBuilderGameConfig = {
  id: 'test',
  name: 'Test Game',
  startStepId: 'trainer-battle-step',
  steps: [
    {
      id: 'trainer-battle-step',
      name: 'Trainer Battle',
      description: 'A trainer battle step',
      options: [],
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
    {
      species: 'Pidgeotto',
      level: 4,
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

describe('Trainer Battle Progression', () => {
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
      activeTrainerBattle: {
        trainer: mockTrainerData,
        defeatedPokemonIndexes: [],
        selectedPokemonIndex: null,
      },
      currentStep: mockGameConfig.steps[0],
    };
  });

  it('allows selecting a Pokemon', () => {
    const selectEntry: RouteBuilderRouteEntry = {
      type: 'trainerBattleAction',
      stepId: 'trainer-battle-step',
      trainerId: 'trainer-1',
      trainerPokemonIndex: 0,
      trainerBattleActionType: 'selectPokemon',
    };

    const newState = applyTrainerBattleActionEntry(mockGameConfig, initialState, selectEntry, 0);
    expect(newState.activeTrainerBattle?.selectedPokemonIndex).toBe(0);
  });

  it('marks Pokemon as defeated when KOed', () => {
    // First select Pokemon 0
    let state = applyTrainerBattleActionEntry(
      mockGameConfig,
      initialState,
      {
        type: 'trainerBattleAction',
        stepId: 'trainer-battle-step',
        trainerId: 'trainer-1',
        trainerPokemonIndex: 0,
        trainerBattleActionType: 'selectPokemon',
      },
      0,
    );

    // Then KO it
    state = applyTrainerBattleActionEntry(
      mockGameConfig,
      state,
      {
        type: 'trainerBattleAction',
        stepId: 'trainer-battle-step',
        trainerId: 'trainer-1',
        trainerPokemonIndex: 0,
        trainerBattleActionType: 'ko',
      },
      1,
    );

    expect(state.activeTrainerBattle?.defeatedPokemonIndexes).toContain(0);
    expect(state.activeTrainerBattle?.selectedPokemonIndex).toBeNull();
  });

  it('finishes battle when all Pokemon are defeated', () => {
    let state = initialState;

    // KO first Pokemon
    state = applyTrainerBattleActionEntry(
      mockGameConfig,
      state,
      {
        type: 'trainerBattleAction',
        stepId: 'trainer-battle-step',
        trainerId: 'trainer-1',
        trainerPokemonIndex: 0,
        trainerBattleActionType: 'selectPokemon',
      },
      0,
    );

    state = applyTrainerBattleActionEntry(
      mockGameConfig,
      state,
      {
        type: 'trainerBattleAction',
        stepId: 'trainer-battle-step',
        trainerId: 'trainer-1',
        trainerPokemonIndex: 0,
        trainerBattleActionType: 'ko',
      },
      1,
    );

    // KO second Pokemon
    state = applyTrainerBattleActionEntry(
      mockGameConfig,
      state,
      {
        type: 'trainerBattleAction',
        stepId: 'trainer-battle-step',
        trainerId: 'trainer-1',
        trainerPokemonIndex: 1,
        trainerBattleActionType: 'selectPokemon',
      },
      2,
    );

    state = applyTrainerBattleActionEntry(
      mockGameConfig,
      state,
      {
        type: 'trainerBattleAction',
        stepId: 'trainer-battle-step',
        trainerId: 'trainer-1',
        trainerPokemonIndex: 1,
        trainerBattleActionType: 'ko',
      },
      3,
    );

    expect(state.activeTrainerBattle).toBeNull();
  });
});
