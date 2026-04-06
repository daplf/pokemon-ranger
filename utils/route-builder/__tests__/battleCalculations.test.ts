import { getAvailableRouteBuilderBattleActions, getAvailableTrainerBattleActions } from '../battleCalculations';
import { RouteBuilderGameConfig, RouteBuilderRouteEntry } from '../types';
import { getRouteBuilderStep } from '../gameConfig';

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
  getRouteBuilderStep: jest.fn((game, stepId) => game.steps.find(s => s.id === stepId)),
  getTrainerData: jest.fn(() => mockTrainerData),
  getRouteBuilderPokemonData: jest.fn(() => ({
    growthRate: 'medium-slow',
    baseStats: { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
    types: ['normal'],
    evYield: { hp: 1, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    learnset: [],
    baseExperience: 50,
  })),
  getRouteBuilderMoveData: jest.fn(() => ({
    name: 'Tackle',
    type: 'normal',
    category: 'physical',
    power: 40,
    accuracy: 100,
    pp: 35,
  })),
}));

jest.mock('../stateManagement', () => ({
  getCurrentRouteBuilderStep: jest.fn((game, route) => {
    const currentEntry = [...route].reverse().find(entry => entry.type === 'step');
    return currentEntry ? getRouteBuilderStep(game, currentEntry.stepId) : undefined;
  }),
  buildRouteBuilderState: jest.fn(() => ({
    party: [{
      species: 'Turtwig',
      level: 5,
      nature: 'hardy',
      evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
      moves: ['Tackle'],
    }],
  })),
  clonePartyState: jest.fn(party => party),
  asBattlePokemon: jest.fn(pokemon => pokemon),
  getAvailableBagItems: jest.fn(() => []),
}));

const mockGameConfig: RouteBuilderGameConfig = {
  id: 'test',
  name: 'Test Game',
  startStepId: 'battle-step',
  steps: [
    {
      id: 'battle-step',
      name: 'Battle Step',
      description: 'A battle step',
      options: [],
      battle: {
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

describe('battleCalculations', () => {
  describe('getAvailableRouteBuilderBattleActions', () => {
    it('includes KO action when no battle actions exist after current step', () => {
      const route: RouteBuilderRouteEntry[] = [
        { type: 'step', stepId: 'battle-step' },
      ];

      const actions = getAvailableRouteBuilderBattleActions(mockGameConfig, route);
      const koAction = actions.find(action => action.type === 'ko');
      expect(koAction).toBeDefined();
    });

    it('includes KO action when battle actions exist after current step but no KO', () => {
      const route: RouteBuilderRouteEntry[] = [
        { type: 'step', stepId: 'battle-step' },
        { type: 'battleAction', stepId: 'battle-step', battleActionId: 'move-tackle' },
      ];

      const actions = getAvailableRouteBuilderBattleActions(mockGameConfig, route);
      const koAction = actions.find(action => action.type === 'ko');
      expect(koAction).toBeDefined();
    });

    it('returns no actions when a KO action already exists after current step', () => {
      const route: RouteBuilderRouteEntry[] = [
        { type: 'step', stepId: 'battle-step' },
        { type: 'battleAction', stepId: 'battle-step', battleActionId: 'ko' },
      ];

      const actions = getAvailableRouteBuilderBattleActions(mockGameConfig, route);
      expect(actions).toEqual([]);
    });
  });

  describe('getAvailableTrainerBattleActions', () => {
    const trainerRoute: RouteBuilderRouteEntry[] = [
      { type: 'step', stepId: 'battle-step' },
      { type: 'trainerBattle', stepId: 'battle-step', trainerId: 'trainer-1' },
      { type: 'trainerBattleAction', stepId: 'battle-step', trainerId: 'trainer-1', trainerBattleActionType: 'selectPokemon', trainerPokemonIndex: 0 },
    ];

    it('includes KO action when no battle actions exist after current step', () => {
      const actions = getAvailableTrainerBattleActions(mockGameConfig, trainerRoute);
      const koAction = actions.find(action => action.type === 'ko');
      expect(koAction).toBeDefined();
    });

    it('includes KO action when battle actions exist after current step but no KO', () => {
      const routeWithActions: RouteBuilderRouteEntry[] = [
        ...trainerRoute,
        { type: 'trainerBattleAction', stepId: 'battle-step', trainerId: 'trainer-1', trainerBattleActionType: 'move' },
      ];

      const actions = getAvailableTrainerBattleActions(mockGameConfig, routeWithActions);
      const koAction = actions.find(action => action.type === 'ko');
      expect(koAction).toBeDefined();
    });

    it('returns no actions when a KO action already exists after current step', () => {
      const routeWithKo: RouteBuilderRouteEntry[] = [
        ...trainerRoute,
        { type: 'trainerBattleAction', stepId: 'battle-step', trainerId: 'trainer-1', trainerBattleActionType: 'ko' },
      ];

      const actions = getAvailableTrainerBattleActions(mockGameConfig, routeWithKo);
      expect(actions).toEqual([]);
    });
  });
});
