import {
  calculateDamageRanges,
  calculateDamageValues,
  calculateHP,
  calculateMoveEffectiveness,
  calculateStat,
  combineIdenticalLines,
  formatIVRangeSet,
  getNatureMultiplier,
  NATURES,
  Stat,
  StatLine,
} from 'relicalc';

import {
  RouteBuilderGameConfig,
  RouteBuilderPokemonInParty,
  RouteBuilderBattlePokemon,
  RouteBuilderTrainerBattleAction,
  RouteBuilderResolvedBattleAction,
  RouteBuilderRouteEntry,
  RouteBuilderStatSpread,
  RouteBuilderActiveTrainerBattle,
  RouteBuilderTrainer,
} from './types';
import {
  getAreaTrainerList,
  getRouteBuilderGame,
  getRouteBuilderPokemonData,
  getRouteBuilderMoveData,
  getTrainerData,
} from './gameConfig';
import {
  getCurrentRouteBuilderStep,
  buildRouteBuilderState,
  clonePartyState,
  getDefeatedTrainerIds,
  getAvailableBagItems,
  asBattlePokemon,
  prerequisitesAreMet,
  getUnlockedHms,
} from './stateManagement';

/**
 * Gets the currently active trainer battle from route history
 */
export function getActiveTrainerBattle(
  gameId: string,
  route: RouteBuilderRouteEntry[],
): RouteBuilderActiveTrainerBattle | null {
  return route.reduce<RouteBuilderActiveTrainerBattle | null>((activeBattle, entry) => {
    if (entry.type === 'trainerBattle') {
      const trainer = entry.trainerId ? getTrainerData(gameId, entry.trainerId) : undefined;

      if (!trainer) return activeBattle;

      return {
        trainer,
        defeatedPokemonIndexes: [],
        selectedPokemonIndex: null,
      };
    }

    if (entry.type !== 'trainerBattleAction' || !activeBattle) return activeBattle;

    if (entry.trainerBattleActionType === 'selectPokemon' && typeof entry.trainerPokemonIndex === 'number') {
      return {
        ...activeBattle,
        selectedPokemonIndex: entry.trainerPokemonIndex,
      };
    }

    if (entry.trainerBattleActionType === 'ko' && typeof activeBattle.selectedPokemonIndex === 'number') {
      const defeatedPokemonIndexes = [...activeBattle.defeatedPokemonIndexes, activeBattle.selectedPokemonIndex];
      const defeatedUniqueIndexes = [...new Set(defeatedPokemonIndexes)];

      if (defeatedUniqueIndexes.length >= activeBattle.trainer.pokemon.length) {
        return null;
      }

      return {
        ...activeBattle,
        defeatedPokemonIndexes: defeatedUniqueIndexes,
        selectedPokemonIndex: null,
      };
    }

    return activeBattle;
  }, null);
}

/**
 * Gets available trainers for a step, filtered by prerequisites
 */
export function getAvailableTrainersForStep(
  gameId: string,
  stepId: string,
  route: RouteBuilderRouteEntry[],
): RouteBuilderTrainer[] {
  const area = getAreaTrainerList(gameId, stepId);

  if (area) {
    const beatenTrainerIds = getDefeatedTrainerIds(gameId, route);
    const unlockedHms = getUnlockedHmsByGameId(gameId, route);
    const game = getRouteBuilderGame(gameId);

    if (game) {
      const state = buildRouteBuilderState(game, route);
      const progressionFlags = state.progressionFlags || {};

      return area.trainerIds
        .map((trainerId: string) => getTrainerData(gameId, trainerId))
        .filter((trainer: RouteBuilderTrainer | undefined): trainer is RouteBuilderTrainer => trainer !== undefined)
        .filter((trainer: any) => trainerIsAvailable(trainer, beatenTrainerIds, unlockedHms, progressionFlags));
    }
  }

  return [];
}

/**
 * Helper: checks if a trainer is available based on prerequisites
 */
function trainerIsAvailable(trainer: any, beatenTrainerIds: string[], unlockedHms: any[], progressionFlags: Record<string, any>): boolean {
  if (beatenTrainerIds.includes(trainer.id)) return false;

  return prerequisitesAreMet(trainer.prerequisites, beatenTrainerIds, unlockedHms, {}, progressionFlags);
}

/**
 * Helper: gets unlocked HMs by game ID
 */
function getUnlockedHmsByGameId(gameId: string, route: RouteBuilderRouteEntry[]): any[] {
  const game = getRouteBuilderGame(gameId);

  if (!game) return [];

  return getUnlockedHms(game, route);
}

/**
 * Calculates damage from one Pokemon to another for a specific move
 */
function calculateBattleDamage(
  gameId: string,
  attacker: RouteBuilderPokemonInParty,
  defender: RouteBuilderBattlePokemon,
  moveName: string,
): { summary: string; details?: string[]; } | null {
  const moveData = getRouteBuilderMoveData(gameId, moveName);
  const attackerData = getRouteBuilderPokemonData(gameId, attacker.species);
  const defenderData = getRouteBuilderPokemonData(gameId, defender.species);
  const attackerStats = calculatePokemonStats(gameId, attacker);
  const defenderStats = calculatePokemonStats(gameId, defender);

  if (!moveData || !attackerData || !defenderData || !attackerStats || !defenderStats) return null;
  if (moveData.category === 'status' || moveData.power <= 0) return null;

  const offensiveStat = moveData.category === 'physical' ? 'attack' : 'spAttack';
  const attackStat = moveData.category === 'physical' ? attackerStats.attack : attackerStats.spAttack;
  const defenseStat2 = moveData.category === 'physical' ? defenderStats.defense : defenderStats.spDefense;
  const stabModifier = attackerData.types.includes(moveData.type) ? 1.5 : 1;
  const effectivenessModifier = calculateMoveEffectiveness(moveData.type, 8, ...defenderData.types);

  if (attacker.hasRandomIvs) {
    const compactRanges = combineIdenticalLines(calculateDamageRanges({
      level: attacker.level,
      baseStat: getBaseStatValue(attackerData.baseStats, offensiveStat as Stat),
      evs: getStatSpreadValue(attacker.evs, offensiveStat as Stat),
      combatStages: 0,
      stab: stabModifier > 1,
      typeEffectiveness: effectivenessModifier,
      offensiveMode: true,
      movePower: moveData.power,
      criticalHit: false,
      doubles: false,
      torrent: false,
      multiTarget: false,
      weatherBoosted: false,
      weatherReduced: false,
      generation: 8,
      otherModifier: 1,
      opponentLevel: defender.level,
      opponentStat: defenseStat2,
      opponentCombatStages: 0,
      friendship: 0,
      screen: false,
      choiceItem: false,
      adaptability: false,
      terastallized: false,
      statModifier: 1,
      opponentStatModifier: 1,
      otherPowerModifier: 1,
    }));
    const details = compactRanges.map(range => (
      `${range.damageRangeOutput} damage (${formatHitCountSummary(defenderStats.hp, range.minDamage, range.maxDamage)}, IVs ${formatIVRangeSet(range)})`
    ));

    return {
      summary: details[0] ?? 'No damage',
      details,
    };
  }

  const rolls = calculateDamageValues(
    attacker.level,
    moveData.power,
    attackStat,
    defenseStat2,
    [1],
    [1],
    [stabModifier, effectivenessModifier],
  );

  return {
    summary: `${formatDamageSummary({
      min: Math.min(...rolls),
      max: Math.max(...rolls),
    })} (${formatHitCountSummary(defenderStats.hp, Math.min(...rolls), Math.max(...rolls))})`,
  };
}

/**
 * Calculates stats for a Pokemon with given EVs, IVs, nature, and level
 */
function calculatePokemonStats(
  gameId: string,
  pokemon: RouteBuilderBattlePokemon | RouteBuilderPokemonInParty,
): StatLine | undefined {
  const pokemonData = getRouteBuilderPokemonData(gameId, pokemon.species);

  if (!pokemonData) return undefined;

  return {
    hp: calculateHP(pokemon.level, pokemonData.baseStats.hp, pokemon.ivs.hp, pokemon.evs.hp, 8),
    attack: calculateStat(
      pokemon.level,
      pokemonData.baseStats.attack,
      pokemon.ivs.attack,
      pokemon.evs.attack,
      getNatureModifierForStat(pokemon.nature, 'attack'),
    ),
    defense: calculateStat(
      pokemon.level,
      pokemonData.baseStats.defense,
      pokemon.ivs.defense,
      pokemon.evs.defense,
      getNatureModifierForStat(pokemon.nature, 'defense'),
    ),
    spAttack: calculateStat(
      pokemon.level,
      pokemonData.baseStats.specialAttack,
      pokemon.ivs.specialAttack,
      pokemon.evs.specialAttack,
      getNatureModifierForStat(pokemon.nature, 'spAttack'),
    ),
    spDefense: calculateStat(
      pokemon.level,
      pokemonData.baseStats.specialDefense,
      pokemon.ivs.specialDefense,
      pokemon.evs.specialDefense,
      getNatureModifierForStat(pokemon.nature, 'spDefense'),
    ),
    speed: calculateStat(
      pokemon.level,
      pokemonData.baseStats.speed,
      pokemon.ivs.speed,
      pokemon.evs.speed,
      getNatureModifierForStat(pokemon.nature, 'speed'),
    ),
  };
}

/**
 * Helper: gets nature multiplier for a stat
 */
function getNatureModifierForStat(natureName: string, stat: Stat): number {
  const natureKey = (natureName.toLowerCase() ?? 'hardy') as keyof typeof NATURES;
  const natureDefinition = NATURES[natureKey] ?? NATURES.hardy;

  return getNatureMultiplier(stat, natureDefinition);
}

/**
 * Helper: gets stat spread value
 */
function getStatSpreadValue(spread: RouteBuilderStatSpread, stat: Stat | string): number {
  switch (stat) {
    case 'hp':
      return spread.hp;
    case 'attack':
      return spread.attack;
    case 'defense':
      return spread.defense;
    case 'spAttack':
      return spread.specialAttack;
    case 'spDefense':
      return spread.specialDefense;
    case 'speed':
      return spread.speed;
    default:
      return 0;
  }
}

/**
 * Helper: gets base stat value
 */
function getBaseStatValue(baseStats: RouteBuilderStatSpread, stat: Stat | string): number {
  return getStatSpreadValue(baseStats, stat);
}

/**
 * Helper: formats damage summary
 */
function formatDamageSummary(damageRange: { min: number; max: number; }): string {
  return damageRange.min === damageRange.max
    ? `${damageRange.min} damage`
    : `${damageRange.min}-${damageRange.max} damage`;
}

/**
 * Helper: formats hit count summary (OHKO, 2HKO, etc)
 */
function formatHitCountSummary(targetHp: number, minDamage: number, maxDamage: number): string {
  if (targetHp <= 0 || maxDamage <= 0) return 'No KO';

  const safestMinDamage = Math.max(minDamage, 1);
  const fastestKo = Math.ceil(targetHp / maxDamage);
  const slowestKo = Math.ceil(targetHp / safestMinDamage);

  return fastestKo === slowestKo
    ? `${fastestKo}HKO`
    : `${fastestKo}-${slowestKo}HKO`;
}

/**
 * Helper: checks if there are battle actions after the current step in the route
 */
function hasBattleActionsAfterCurrentStep(route: RouteBuilderRouteEntry[]): boolean {
  // Find the index of the last step entry
  const lastStepIndex = route.length - 1 - [...route].reverse().findIndex(entry => entry.type === 'step');
  
  // Check if there is already a KO action after the last step
  for (let i = lastStepIndex + 1; i < route.length; i += 1) {
    const entry = route[i];
    if ((entry.type === 'battleAction' && entry.battleActionId === 'ko')
        || (entry.type === 'trainerBattleAction' && entry.trainerBattleActionType === 'ko')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Gets available wild battle actions for the current step's battle
 * Dynamically generates move actions from the lead Pokémon's moves (like trainer battles)
 */
export function getAvailableRouteBuilderBattleActions(
  game: RouteBuilderGameConfig,
  route: RouteBuilderRouteEntry[],
  partyOverride?: RouteBuilderPokemonInParty[],
): RouteBuilderResolvedBattleAction[] {
  const currentStep = getCurrentRouteBuilderStep(game, route);

  if (!currentStep?.battle) return [];

  // If there is already a KO action after the current step, the battle has ended
  if (hasBattleActionsAfterCurrentStep(route)) return [];

  const state = partyOverride
    ? { party: clonePartyState(partyOverride) }
    : buildRouteBuilderState(game, route);
  const leadPokemon = state.party[0];
  const { opponent } = currentStep.battle;

  const actions: RouteBuilderResolvedBattleAction[] = [];

  // Generate move actions from lead Pokémon's moves
  if (leadPokemon && opponent) {
    const moveActions = (leadPokemon.moves ?? []).map(moveName => {
      const damageResult = calculateBattleDamage(game.id, leadPokemon, opponent, moveName);
      const opponentStats = calculatePokemonStats(game.id, opponent);

      return {
        id: `move-${slugify(moveName)}`,
        label: `Use ${moveName}`,
        description: `Attack with ${moveName}.`,
        type: 'move' as const,
        targetHpSummary: opponentStats ? `Target HP: ${opponentStats.hp}` : undefined,
        damageSummary: damageResult?.summary ?? 'No damage',
        damageDetails: damageResult?.details,
      };
    });

    actions.push(...moveActions);
  }

  // Add item usage as an action when items are available in battle
  if (currentStep && !currentStep.disableItemUsage) {
    const availableBattleItems = getAvailableBagItems(game, route, 'battle');
    if (availableBattleItems.length > 0) {
      actions.push({
        id: 'use-item',
        label: 'Use Item',
        description: 'Use an item from your bag.',
        type: 'item' as const,
      });
    }
  }

  // Always add KO action as the final option
  actions.push({
    id: 'ko',
    label: 'KO the opponent',
    description: 'End the battle.',
    type: 'ko' as const,
  });

  return actions;
}

/**
 * Gets available trainer battle actions based on current battle state
 */
export function getAvailableTrainerBattleActions(
  game: RouteBuilderGameConfig,
  route: RouteBuilderRouteEntry[],
  partyOverride?: RouteBuilderPokemonInParty[],
): RouteBuilderTrainerBattleAction[] {
  const activeTrainerBattle = getActiveTrainerBattle(game.id, route);
  const currentStep = getCurrentRouteBuilderStep(game, route);

  if (!activeTrainerBattle) return [];

  // If there is already a KO action after the current step, the battle phase has ended
  if (hasBattleActionsAfterCurrentStep(route)) return [];

  // Pokemon selection phase
  if (activeTrainerBattle.selectedPokemonIndex === null) {
    return activeTrainerBattle.trainer.pokemon
      .map((pokemon, index) => ({ pokemon, index }))
      .filter(({ index }) => !activeTrainerBattle.defeatedPokemonIndexes.includes(index))
      .map(({ pokemon, index }) => ({
        id: `${activeTrainerBattle.trainer.id}-select-${index}`,
        label: `Fight ${pokemon.species} Lv. ${pokemon.level}`,
        description: `${activeTrainerBattle.trainer.name}'s ${pokemon.species}.`,
        type: 'selectPokemon' as const,
        trainerId: activeTrainerBattle.trainer.id,
        trainerPokemonIndex: index,
      }));
  }

  // Move/KO phase
  const leadPokemon = partyOverride
    ? clonePartyState(partyOverride)[0]
    : buildRouteBuilderState(game, route).party[0];
  const selectedPokemon = activeTrainerBattle.trainer.pokemon[activeTrainerBattle.selectedPokemonIndex];
  const selectedBattlePokemon = selectedPokemon ? asBattlePokemon(selectedPokemon) : undefined;
  const selectedPokemonStats = selectedBattlePokemon ? calculatePokemonStats(game.id, selectedBattlePokemon) : undefined;

  const moveActions = (leadPokemon?.moves ?? []).map(moveName => {
    const damageResult = selectedBattlePokemon
      ? calculateBattleDamage(game.id, leadPokemon, selectedBattlePokemon, moveName)
      : null;

    return {
      id: `${activeTrainerBattle.trainer.id}-move-${slugify(moveName)}`,
      label: `Use ${moveName}`,
      description: selectedPokemon ? `Attack ${selectedPokemon.species} with ${moveName}.` : undefined,
      type: 'move' as const,
      trainerId: activeTrainerBattle.trainer.id,
      trainerPokemonIndex: activeTrainerBattle.selectedPokemonIndex ?? undefined,
      moveName,
      targetHpSummary: selectedPokemonStats ? `Target HP: ${selectedPokemonStats.hp}` : undefined,
      damageSummary: damageResult?.summary ?? 'No damage',
      damageDetails: damageResult?.details,
    };
  });

  const itemsAvailableInBattle = currentStep && !currentStep.disableItemUsage
    ? getAvailableBagItems(game, route, 'battle')
    : [];

  const actionList: RouteBuilderTrainerBattleAction[] = [
    ...moveActions,
  ];

  if (itemsAvailableInBattle.length > 0) {
    actionList.push({
      id: `${activeTrainerBattle.trainer.id}-use-item`,
      label: 'Use Item',
      description: 'Use an item from your bag.',
      type: 'item',
      trainerId: activeTrainerBattle.trainer.id,
    });
  }

  actionList.push({
    id: `${activeTrainerBattle.trainer.id}-ko-${activeTrainerBattle.selectedPokemonIndex}`,
    label: selectedPokemon ? `KO ${selectedPokemon.species} Lv. ${selectedPokemon.level}` : 'KO opposing Pokemon',
    description: selectedPokemon
      ? `Defeat ${selectedPokemon.species} and continue the trainer battle.`
      : 'Defeat the current opposing Pokemon.',
    type: 'ko',
    trainerId: activeTrainerBattle.trainer.id,
    trainerPokemonIndex: activeTrainerBattle.selectedPokemonIndex ?? undefined,
  });

  return actionList;
}

/**
 * Helper: converts string to slug format
 */
function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
