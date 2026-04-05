import {
  getBattleActionInsertionIndex,
  getBattleActionRouteIndex,
  removeSelectedBattleActionEntry,
  removeSelectedBattleEntry,
} from '../routeEditing';
import { RouteBuilderRouteEntry } from '../types';

describe('routeEditing', () => {
  const stepEntry: RouteBuilderRouteEntry = { type: 'step', stepId: 'starly' };
  const moveOne: RouteBuilderRouteEntry = { type: 'battleAction', stepId: 'starly', battleActionId: 'move-tackle', label: 'Use Tackle' };
  const moveTwo: RouteBuilderRouteEntry = { type: 'battleAction', stepId: 'starly', battleActionId: 'move-gust', label: 'Use Gust' };
  const koAction: RouteBuilderRouteEntry = { type: 'battleAction', stepId: 'starly', battleActionId: 'ko', label: 'KO the opponent' };
  const nextStep: RouteBuilderRouteEntry = { type: 'step', stepId: 'route-202', arrivedViaOptionId: 'ko' };

  const route = [stepEntry, moveOne, moveTwo, koAction, nextStep];
  const routeHistory = [
    {
      routeIndex: 0,
      battleActionEntries: [
        { entry: moveOne, label: 'Use Tackle', isKo: false },
        { entry: moveTwo, label: 'Use Gust', isKo: false },
        { entry: koAction, label: 'KO the opponent', isKo: true },
      ],
    },
  ];

  it('returns the KO index when inserting a new move after the selected step', () => {
    const insertionIndex = getBattleActionInsertionIndex(route, routeHistory, 0, null);
    expect(insertionIndex).toBe(3);
  });

  it('returns the index right after the selected battle action', () => {
    const insertionIndex = getBattleActionInsertionIndex(route, routeHistory, 0, 1);
    expect(insertionIndex).toBe(3);
  });

  it('returns route index for the selected battle action', () => {
    const routeIndex = getBattleActionRouteIndex(route, routeHistory, 0, 1);
    expect(routeIndex).toBe(2);
  });

  it('removes only the selected battle action from the route', () => {
    const result = removeSelectedBattleActionEntry(route, routeHistory, 0, 1);
    expect(result).toEqual([stepEntry, moveOne, koAction, nextStep]);
  });

  it('removes a KO battle action and its follow-up step when undoing the KO', () => {
    const result = removeSelectedBattleActionEntry(route, routeHistory, 0, 2);
    expect(result).toEqual([stepEntry, moveOne, moveTwo]);
  });

  it('removes the whole battle sequence when the battle step is selected', () => {
    const previousStep: RouteBuilderRouteEntry = { type: 'step', stepId: 'route-100' };
    const followingStep: RouteBuilderRouteEntry = { type: 'step', stepId: 'route-300', arrivedViaOptionId: 'route-200-to-300' };
    const battleRoute = [previousStep, stepEntry, moveOne, koAction, nextStep, followingStep];

    const result = removeSelectedBattleEntry(battleRoute, 1);
    expect(result).toEqual([previousStep, followingStep]);
  });

  it('removes the correct scratch when undoing a middle move and leaves remaining actions intact', () => {
    const routeWithThreeScratches = [
      stepEntry,
      moveOne,
      moveTwo,
      moveTwo,
      koAction,
      nextStep,
    ];
    const routeHistoryWithThreeScratches = [
      {
        routeIndex: 0,
        battleActionEntries: [
          { entry: moveOne, label: 'Use Tackle', isKo: false },
          { entry: moveTwo, label: 'Use Gust', isKo: false },
          { entry: moveTwo, label: 'Use Gust', isKo: false },
          { entry: koAction, label: 'KO the opponent', isKo: true },
        ],
      },
    ];
    const result = removeSelectedBattleActionEntry(routeWithThreeScratches, routeHistoryWithThreeScratches, 0, 1);
    expect(result).toEqual([stepEntry, moveOne, moveTwo, koAction, nextStep]);
  });

  it('inserts a new move after the selected battle action in a battle sequence', () => {
    const routeWithTwoScratches = [stepEntry, moveOne, moveTwo, koAction, nextStep];
    const routeHistoryWithTwoScratches = [
      {
        routeIndex: 0,
        battleActionEntries: [
          { entry: moveOne, label: 'Use Tackle', isKo: false },
          { entry: moveTwo, label: 'Use Gust', isKo: false },
          { entry: koAction, label: 'KO the opponent', isKo: true },
        ],
      },
    ];
    const insertionIndex = getBattleActionInsertionIndex(routeWithTwoScratches, routeHistoryWithTwoScratches, 0, 0);
    expect(insertionIndex).toBe(2);

    const newMove: RouteBuilderRouteEntry = {
      type: 'battleAction',
      stepId: 'starly',
      battleActionId: 'move-leer',
      label: 'Use Leer',
    };

    const result = [
      ...routeWithTwoScratches.slice(0, insertionIndex),
      newMove,
      ...routeWithTwoScratches.slice(insertionIndex),
    ];

    expect(result).toEqual([
      stepEntry,
      moveOne,
      newMove,
      moveTwo,
      koAction,
      nextStep,
    ]);
  });

  it('correctly removes a middle scratch from a realistic route layout', () => {
    const routeWithThreeScratches = [
      { type: 'step', stepId: 'twinleaf-town' },
      { type: 'step', stepId: 'route-201', arrivedViaOptionId: 'twinleaf-to-route-201' },
      { type: 'step', stepId: 'lake-verity', arrivedViaOptionId: 'route-201-to-lake-verity' },
      { type: 'step', stepId: 'starter-pick', arrivedViaOptionId: 'starter-pick' },
      { type: 'step', stepId: 'starter-chimchar', arrivedViaOptionId: 'pick-chimchar' },
      stepEntry,
      moveOne,
      moveTwo,
      moveTwo,
      koAction,
      nextStep,
    ];
    const routeHistoryWithThreeScratches = [
      {
        routeIndex: 5,
        battleActionEntries: [
          { entry: moveOne, label: 'Use Tackle', isKo: false },
          { entry: moveTwo, label: 'Use Gust', isKo: false },
          { entry: moveTwo, label: 'Use Gust', isKo: false },
          { entry: koAction, label: 'KO the opponent', isKo: true },
        ],
      },
    ];
    const result = removeSelectedBattleActionEntry(routeWithThreeScratches, routeHistoryWithThreeScratches, 5, 1);
    expect(result).toEqual([
      { type: 'step', stepId: 'twinleaf-town' },
      { type: 'step', stepId: 'route-201', arrivedViaOptionId: 'twinleaf-to-route-201' },
      { type: 'step', stepId: 'lake-verity', arrivedViaOptionId: 'route-201-to-lake-verity' },
      { type: 'step', stepId: 'starter-pick', arrivedViaOptionId: 'starter-pick' },
      { type: 'step', stepId: 'starter-chimchar', arrivedViaOptionId: 'pick-chimchar' },
      stepEntry,
      moveOne,
      moveTwo,
      koAction,
      nextStep,
    ]);
  });

  it('inserts Leer after the first Scratch in a full battle sequence', () => {
    const fullRoute = [
      { type: 'step', stepId: 'starter-chimchar', arrivedViaOptionId: 'pick-chimchar' },
      { type: 'step', stepId: 'starly' },
      moveOne, // Scratch
      moveTwo, // Scratch
      koAction,
      { type: 'step', stepId: 'route-202', arrivedViaOptionId: 'ko' },
    ];
    const fullRouteHistory = [
      {
        routeIndex: 1,
        battleActionEntries: [
          { entry: moveOne, label: 'Use Scratch', isKo: false },
          { entry: moveTwo, label: 'Use Scratch', isKo: false },
          { entry: koAction, label: 'KO the opponent', isKo: true },
        ],
      },
    ];

    const insertionIndex = getBattleActionInsertionIndex(fullRoute, fullRouteHistory, 1, 0);
    expect(insertionIndex).toBe(3);

    const leerMove: RouteBuilderRouteEntry = {
      type: 'battleAction',
      stepId: 'starly',
      battleActionId: 'move-leer',
      label: 'Use Leer',
    };

    const result = [
      ...fullRoute.slice(0, insertionIndex),
      leerMove,
      ...fullRoute.slice(insertionIndex),
    ];

    expect(result).toEqual([
      { type: 'step', stepId: 'starter-chimchar', arrivedViaOptionId: 'pick-chimchar' },
      { type: 'step', stepId: 'starly' },
      moveOne,
      leerMove,
      moveTwo,
      koAction,
      { type: 'step', stepId: 'route-202', arrivedViaOptionId: 'ko' },
    ]);
  });

  // Note: The following tests describe expected behavior for step undo and insertion that creates gaps.
  // These are integration tests that would require testing the full component state.
  // Twinleaf -> 201 -> Lake, selecting 201 and clicking Undo should create a gap: Twinleaf; and Lake
  // Twinleaf -> 201 -> Lake, selecting 201 and clicking Twinleaf should create a gap: Twinleaf -> 201 -> Twinleaf; and Lake.
  // If then adding 201 to the second Twinleaf, it should reattach the route and lead to Twinleaf -> 201 -> Twinleaf -> Lake
});
