import { RouteBuilderRouteEntry } from './types';

export interface RouteHistoryBattleActionEntry {
  entry: RouteBuilderRouteEntry;
  label: string;
  isKo: boolean;
}

export interface RouteHistoryItem {
  routeIndex: number;
  battleActionEntries?: RouteHistoryBattleActionEntry[];
}

export function getRouteHistoryItemForRouteIndex(
  routeHistory: RouteHistoryItem[],
  selectedRouteIndex: number,
): RouteHistoryItem | undefined {
  return routeHistory.find(item => item.routeIndex === selectedRouteIndex);
}

export function getBattleActionRouteIndex(
  route: RouteBuilderRouteEntry[],
  routeHistory: RouteHistoryItem[],
  selectedRouteIndex: number,
  selectedBattleActionIndex: number | null,
): number | null {
  const historyItem = getRouteHistoryItemForRouteIndex(routeHistory, selectedRouteIndex);
  if (!historyItem?.battleActionEntries?.length || selectedBattleActionIndex === null) {
    return null;
  }

  const selectedBattleAction = historyItem.battleActionEntries[selectedBattleActionIndex];
  if (!selectedBattleAction) {
    return null;
  }

  return route.findIndex(entry => entry === selectedBattleAction.entry);
}

export function getBattleActionInsertionIndex(
  route: RouteBuilderRouteEntry[],
  routeHistory: RouteHistoryItem[],
  selectedRouteIndex: number,
  selectedBattleActionIndex: number | null,
): number | null {
  const historyItem = getRouteHistoryItemForRouteIndex(routeHistory, selectedRouteIndex);
  if (!historyItem?.battleActionEntries?.length) {
    return null;
  }

  if (selectedBattleActionIndex !== null) {
    const selectedBattleAction = historyItem.battleActionEntries[selectedBattleActionIndex];
    if (!selectedBattleAction) return null;
    return route.findIndex(entry => entry === selectedBattleAction.entry) + 1;
  }

  const firstKoIndex = historyItem.battleActionEntries.findIndex(entry => entry.isKo);
  if (firstKoIndex !== -1) {
    const koEntry = historyItem.battleActionEntries[firstKoIndex].entry;
    return route.findIndex(entry => entry === koEntry);
  }

  const lastBattleAction = historyItem.battleActionEntries[historyItem.battleActionEntries.length - 1];
  return route.findIndex(entry => entry === lastBattleAction.entry) + 1;
}

export function removeSelectedBattleActionEntry(
  route: RouteBuilderRouteEntry[],
  routeHistory: RouteHistoryItem[],
  selectedRouteIndex: number,
  selectedBattleActionIndex: number,
): RouteBuilderRouteEntry[] {
  const routeIndexToRemove = getBattleActionRouteIndex(route, routeHistory, selectedRouteIndex, selectedBattleActionIndex);
  if (routeIndexToRemove === null || routeIndexToRemove === -1) {
    return route;
  }

  return route.filter((_, index) => index !== routeIndexToRemove);
}
