import React from 'react';
import styled from 'styled-components';
import { Card, InputSubheader } from '../../components/Layout';
import { RouteBuilderGameConfig, RouteBuilderRouteEntry, RouteBuilderStep, RouteBuilderTrainer } from '../../utils/route-builder';

interface RouteHistoryItem {
  entry: RouteBuilderRouteEntry;
  step: RouteBuilderStep | undefined;
  trainer?: RouteBuilderTrainer;
  substeps: string[];
  routeIndex: number;
  gapBefore: boolean;
  battleActionEntries?: Array<{
    entry: RouteBuilderRouteEntry;
    label: string;
    isKo: boolean;
  }>;
}

interface RouteHistorySectionProps {
  activeGame: RouteBuilderGameConfig | null;
  routeHistory: RouteHistoryItem[];
  selectedRouteIndex: number | null;
  selectedBattleActionIndex: number | null;
  onSelectRouteEntry?: (routeIndex: number, battleActionIndex?: number) => void;
  routeListRef: React.RefObject<HTMLDivElement>;
}

/**
 * RouteHistorySection Component
 * 
 * Displays the complete history of actions taken in the route.
 * Shows:
 * - Main steps visited
 * - Battle actions (moves, KOs)
 * - Trainer battles
 * - Sub-actions undertaken in battles
 */
export const RouteHistorySection: React.FC<RouteHistorySectionProps> = ({
  activeGame,
  routeHistory,
  selectedRouteIndex,
  selectedBattleActionIndex,
  onSelectRouteEntry,
  routeListRef,
}) => {
  if (!activeGame) {
    return (
      <RoutePlaceholder>Select a game to start building a route.</RoutePlaceholder>
    );
  }

  return (
    <>
      <InputSubheader>Route History</InputSubheader>
      <RouteList ref={routeListRef}>
        {routeHistory.map(({ entry, step, trainer, substeps, routeIndex, gapBefore, battleActionEntries }, index) => (
          <React.Fragment key={`${entry.stepId}-${routeIndex}`}> 
            {gapBefore && (
              <GapIndicator>Gap detected here — the remainder of the route is no longer connected.</GapIndicator>
            )}
            <RouteEntryCard
              variant={
                routeIndex === selectedRouteIndex && selectedBattleActionIndex === null
                  ? 'success'
                  : index === routeHistory.length - 1 && selectedBattleActionIndex === null ? 'success' : 'neutral'
              }
              selectable={Boolean(onSelectRouteEntry)}
              selected={routeIndex === selectedRouteIndex && selectedBattleActionIndex === null}
              onClick={() => onSelectRouteEntry?.(routeIndex)}
            >
              <RouteEntryIndex>{index + 1}</RouteEntryIndex>
              <RouteEntryBody>
                <RouteEntryName>{trainer ? `Battle ${trainer.name}` : step?.name ?? entry.stepId}</RouteEntryName>
                <RouteEntryMeta>
                  {index === 0 ? `Start: ${activeGame.name}` : getRouteEntryLabel(activeGame, routeHistory[index - 1].entry, entry)}
                </RouteEntryMeta>
                {battleActionEntries && battleActionEntries.length > 0 && (
                  <BattleSubstepList>
                    {battleActionEntries.map((battleAction, battleActionIndex) => (
                      <BattleSubstep
                        key={`${battleAction.entry.stepId}-${battleActionIndex}`}
                        selectable={Boolean(onSelectRouteEntry)}
                        selected={routeIndex === selectedRouteIndex && selectedBattleActionIndex === battleActionIndex}
                        onClick={(event) => { event.stopPropagation();  onSelectRouteEntry?.(routeIndex, battleActionIndex) }}
                      >
                        {battleAction.label}
                      </BattleSubstep>
                    ))}
                  </BattleSubstepList>
                )}
              </RouteEntryBody>
            </RouteEntryCard>
          </React.Fragment>
        ))}
      </RouteList>
    </>
  );
};

function getRouteEntryLabel(
  game: RouteBuilderGameConfig,
  previousEntry: RouteBuilderRouteEntry,
  currentEntry: RouteBuilderRouteEntry,
): string {
  if (currentEntry.arrivedViaOptionId && currentEntry.type === 'step') {
    const { getRouteBuilderStep, getRouteBuilderBattleAction } = require('../../utils/route-builder');
    const previousStep = getRouteBuilderStep(game, previousEntry.stepId);
    const battleAction = getRouteBuilderBattleAction(previousStep, currentEntry.arrivedViaOptionId);

    if (battleAction) return battleAction.label;
  }

  const { getRouteBuilderStep } = require('../../utils/route-builder');
  const previousStep = getRouteBuilderStep(game, previousEntry.stepId);
  const option = previousStep?.options.find((item: any) => item.id === currentEntry.arrivedViaOptionId);

  return option?.label ?? 'Step taken';
}

const RoutePlaceholder = styled.div`
  color: ${({ theme }) => theme.label};
  font-style: italic;
  margin-top: 1rem;
`;

const RouteList = styled.div`
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow-y: auto;
  gap: 0.75rem;
  padding-top: 0.5rem;
`;

const RouteEntryCard = styled(Card)<{ selectable: boolean; selected: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin: 0;
  padding: 0.75rem 1rem;
  cursor: ${({ selectable }) => (selectable ? 'pointer' : 'default')};
  border-color: ${({ theme, selected }) => (selected ? theme.primary : theme.input.border)};
  background-color: ${({ theme, selected }) => (selected ? theme.primaryBackground ?? '#f0f8ff' : 'inherit')};
  transition: background-color 0.15s ease;

  &:hover {
    background-color: ${({ selectable, theme, selected }) => (selectable && !selected ? theme.input.background : selected ? theme.primaryBackground ?? '#f0f8ff' : 'inherit')};
  }
`;

const GapIndicator = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  margin: 0.5rem 0;
  color: ${({ theme }) => theme.danger ?? '#c0392b'};
  background: ${({ theme }) => theme.dangerBackground ?? 'rgba(192, 57, 43, 0.08)'};
  border-radius: 0.5rem;
  font-size: 0.95rem;
`;

const RouteEntryIndex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background-color: rgba(0, 0, 0, 0.15);
  font-weight: 700;
`;

const RouteEntryBody = styled.div`
  min-width: 0;
  flex-grow: 1;
`;

const RouteEntryName = styled.div`
  font-weight: 700;
`;

const RouteEntryMeta = styled.div`
  color: ${({ theme }) => theme.label};
  margin-top: 0.25rem;
`;

const BattleSubstepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.75rem;
  padding-left: 1rem;
  border-left: 2px solid ${({ theme }) => theme.input.border};
`;

const BattleSubstep = styled.div<{ selectable?: boolean; selected?: boolean }>`
  color: ${({ theme, selected }) => selected ? theme.success : theme.label};
  font-size: 0.95rem;
  cursor: ${({ selectable }) => selectable ? 'pointer' : 'default'};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background-color: ${({ theme, selected }) => selected ? theme.successBackground : 'transparent'};
  border: 1px solid ${({ theme, selected }) => selected ? theme.success : 'transparent'};

  &:hover {
    background-color: ${({ theme, selectable }) => selectable ? theme.input.background : 'transparent'};
  }
`;
