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

function isBattleActionOrTrainerEntry(entry: RouteBuilderRouteEntry): boolean {
  return entry.type === 'battleAction'
    || entry.type === 'trainerBattleAction'
    || entry.type === 'itemUsage';
}

function isKoEntry(entry: RouteBuilderRouteEntry): boolean {
  return (entry.type === 'battleAction' && entry.battleActionId === 'ko')
    || (entry.type === 'trainerBattleAction' && entry.trainerBattleActionType === 'ko');
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

  const historyItem = getRouteHistoryItemForRouteIndex(routeHistory, selectedRouteIndex);
  const selectedBattleAction = historyItem?.battleActionEntries?.[selectedBattleActionIndex];
  const selectedEntry = selectedBattleAction?.entry;
  const nextEntry = route[routeIndexToRemove + 1];
  const shouldRemoveNextStep = selectedEntry
    && isKoEntry(selectedEntry)
    && nextEntry?.type === 'step'
    && typeof nextEntry.arrivedViaOptionId === 'string'
    && nextEntry.arrivedViaOptionId.includes('ko');
  const removeCount = shouldRemoveNextStep ? 2 : 1;

  return route.filter((_, index) => index < routeIndexToRemove || index >= routeIndexToRemove + removeCount);
}

export function removeSelectedBattleEntry(
  route: RouteBuilderRouteEntry[],
  selectedRouteIndex: number,
): RouteBuilderRouteEntry[] {
  const selectedEntry = route[selectedRouteIndex];
  if (!selectedEntry) return route;
  if (selectedEntry.type !== 'step' && selectedEntry.type !== 'trainerBattle') return route;

  let removalEndIndex = selectedRouteIndex + 1;
  while (removalEndIndex < route.length && isBattleActionOrTrainerEntry(route[removalEndIndex])) {
    removalEndIndex += 1;
  }

  if (
    removalEndIndex > selectedRouteIndex + 1
    && isKoEntry(route[removalEndIndex - 1])
    && route[removalEndIndex]?.type === 'step'
    && typeof route[removalEndIndex].arrivedViaOptionId === 'string'
    && route[removalEndIndex]?.arrivedViaOptionId?.includes('ko')
  ) {
    removalEndIndex += 1;
  }

  return route.filter((_, index) => index < selectedRouteIndex || index >= removalEndIndex);
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
