import React, { useEffect, useRef } from 'react';
import { RouteBuilderGameConfig, RouteBuilderRuntimeState, RouteHistoryItem } from '../../utils/route-builder';
import { PartySection } from './PartySection';
import { BagSection } from './BagSection';
import { RouteHistorySection } from './RouteHistorySection';

interface RouteSectionProps {
  activeGame: RouteBuilderGameConfig;
  routeState: RouteBuilderRuntimeState | null;
  routeHistory: RouteHistoryItem[];
  selectedRouteIndex: number | null;
  selectedBattleActionIndex: number | null;
  onSelectRouteEntry: (routeIndex: number, battleActionIndex: number | undefined) => void;
}

export const RouteSection: React.FC<RouteSectionProps> = ({
  activeGame,
  routeState,
  routeHistory,
  selectedRouteIndex,
  selectedBattleActionIndex,
  onSelectRouteEntry,
}) => {
  const routeListRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll route history to bottom
  useEffect(() => {
    if (!routeListRef.current) return;
    routeListRef.current.scrollTop = routeListRef.current.scrollHeight;
  }, [routeHistory.length]);

  return (
    <>
      <PartySection party={routeState?.party ?? []} />

      <BagSection bag={routeState?.bag ?? {}} />

      <RouteHistorySection
        activeGame={activeGame}
        routeHistory={routeHistory}
        selectedRouteIndex={selectedRouteIndex}
        selectedBattleActionIndex={selectedBattleActionIndex}
        onSelectRouteEntry={onSelectRouteEntry}
        routeListRef={routeListRef}
      />
    </>
  );
};
