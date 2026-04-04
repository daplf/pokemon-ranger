import bdspConfig from '../../resources/route-builder/bdsp.json';
import bdspAreaIndex from '../../resources/route-builder/bdsp-area-index.json';
import bdspMoveIndex from '../../resources/route-builder/bdsp-move-index.json';
import bdspPokemonIndex from '../../resources/route-builder/bdsp-pokemon-index.json';
import bdspTrainerIndex from '../../resources/route-builder/bdsp-trainer-index.json';

import {
  RouteBuilderGameConfig,
  RouteBuilderStep,
  RouteBuilderPokemonData,
  RouteBuilderMoveData,
  RouteBuilderTrainer,
  RouteBuilderAreaTrainerList,
  RouteBuilderPokemonIndexEntry,
  RouteBuilderMoveIndexEntry,
  RouteBuilderIndexEntry,
} from './types';

// Configuration and Index Data
const GAME_CONFIGS: RouteBuilderGameConfig[] = [bdspConfig as RouteBuilderGameConfig];
const POKEMON_INDEX_BY_GAME: Record<string, RouteBuilderPokemonIndexEntry[]> = {
  bdsp: bdspPokemonIndex as RouteBuilderPokemonIndexEntry[],
};
const MOVE_INDEX_BY_GAME: Record<string, RouteBuilderMoveIndexEntry[]> = {
  bdsp: bdspMoveIndex as RouteBuilderMoveIndexEntry[],
};
const TRAINER_INDEX_BY_GAME: Record<string, RouteBuilderIndexEntry[]> = {
  bdsp: bdspTrainerIndex as RouteBuilderIndexEntry[],
};
const AREA_INDEX_BY_GAME: Record<string, RouteBuilderIndexEntry[]> = {
  bdsp: bdspAreaIndex as RouteBuilderIndexEntry[],
};

// Data Cache
const POKEMON_DATA_CACHE = new Map<string, RouteBuilderPokemonData>();
const MOVE_DATA_CACHE = new Map<string, RouteBuilderMoveData>();
const TRAINER_DATA_CACHE = new Map<string, RouteBuilderTrainer>();
const AREA_DATA_CACHE = new Map<string, RouteBuilderAreaTrainerList>();

/**
 * Gets all available game configurations
 */
export function getRouteBuilderGames(): RouteBuilderGameConfig[] {
  return GAME_CONFIGS;
}

/**
 * Gets a specific game configuration by ID
 */
export function getRouteBuilderGame(gameId: string): RouteBuilderGameConfig | undefined {
  return GAME_CONFIGS.find(game => game.id === gameId);
}

/**
 * Gets a specific step from a game configuration
 */
export function getRouteBuilderStep(game: RouteBuilderGameConfig, stepId: string): RouteBuilderStep | undefined {
  return game.steps.find(step => step.id === stepId);
}

/**
 * Gets Pokemon data by species and game ID, with caching
 */
export function getRouteBuilderPokemonData(gameId: string, species: string): RouteBuilderPokemonData | undefined {
  const entry = POKEMON_INDEX_BY_GAME[gameId]?.find(item => item.species === species);

  if (!entry) return undefined;

  const cacheKey = `${gameId}:${entry.species}`;
  const cachedPokemon = POKEMON_DATA_CACHE.get(cacheKey);

  if (cachedPokemon) return cachedPokemon;

  // eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires
  const pokemonData = require(`../../resources/route-builder/${entry.file}`) as RouteBuilderPokemonData;
  POKEMON_DATA_CACHE.set(cacheKey, pokemonData);

  return pokemonData;
}

/**
 * Gets move data by move name and game ID, with caching
 */
export function getRouteBuilderMoveData(gameId: string, moveName: string): RouteBuilderMoveData | undefined {
  const entry = MOVE_INDEX_BY_GAME[gameId]?.find(item => item.name === moveName);

  if (!entry) return undefined;

  const cacheKey = `${gameId}:${entry.name}`;
  const cachedMove = MOVE_DATA_CACHE.get(cacheKey);

  if (cachedMove) return cachedMove;

  // eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires
  const moveData = require(`../../resources/route-builder/${entry.file}`) as RouteBuilderMoveData;
  MOVE_DATA_CACHE.set(cacheKey, moveData);

  return moveData;
}

/**
 * Gets all trainers in an area by area ID and game ID, with caching
 */
export function getAreaTrainerList(gameId: string, areaId: string): RouteBuilderAreaTrainerList | undefined {
  const entry = AREA_INDEX_BY_GAME[gameId]?.find(item => item.id === areaId);

  if (!entry) return undefined;

  const cacheKey = `${gameId}:${entry.id}`;
  const cachedArea = AREA_DATA_CACHE.get(cacheKey);

  if (cachedArea) return cachedArea;

  // eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires
  const areaData = require(`../../resources/route-builder/${entry.file}`) as RouteBuilderAreaTrainerList;
  AREA_DATA_CACHE.set(cacheKey, areaData);

  return areaData;
}

/**
 * Gets trainer data by trainer ID and game ID, with caching
 */
export function getTrainerData(gameId: string, trainerId: string): RouteBuilderTrainer | undefined {
  const entry = TRAINER_INDEX_BY_GAME[gameId]?.find(item => item.id === trainerId);

  if (!entry) return undefined;

  const cacheKey = `${gameId}:${entry.id}`;
  const cachedTrainer = TRAINER_DATA_CACHE.get(cacheKey);

  if (cachedTrainer) return cachedTrainer;

  // eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires
  const trainerData = require(`../../resources/route-builder/${entry.file}`) as RouteBuilderTrainer;
  const normalizedTrainerData = {
    ...trainerData,
    pokemon: trainerData.pokemon.map(pokemon => ({
      ...pokemon,
      moves: pokemon.moves.filter(move => move !== '--'),
    })),
  };

  TRAINER_DATA_CACHE.set(cacheKey, normalizedTrainerData);

  return normalizedTrainerData;
}

/**
 * Gets all trainers for a specific step/area
 */
export function getTrainersForStep(gameId: string, stepId: string): RouteBuilderTrainer[] {
  const area = getAreaTrainerList(gameId, stepId);

  if (!area) return [];

  return area.trainerIds
    .map(trainerId => getTrainerData(gameId, trainerId))
    .filter((trainer): trainer is RouteBuilderTrainer => Boolean(trainer));
}
