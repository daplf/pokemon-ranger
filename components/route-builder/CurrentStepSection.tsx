import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { RouteBuilderActiveTrainerBattle, RouteBuilderBattleAction, RouteBuilderOption, RouteBuilderResolvedBattleAction, RouteBuilderRouteEntry, RouteBuilderRuntimeState, RouteBuilderStep, RouteBuilderTrainer, RouteBuilderTrainerBattleAction } from '../../utils/route-builder';
import { CurrentPositionCard } from './CurrentPositionCard';
import { ItemSelectionCard } from './ItemSelectionCard';
import { AvailableActionsSection } from './AvailableActionsSection';

interface CurrentStepSectionProps {
  currentStep: RouteBuilderStep,
  activeTrainerBattle: RouteBuilderActiveTrainerBattle | null,
  activeWildBattleTargetHp: string | null,
  activeTrainerBattleTargetHp: string | null,
  availableItems: string[],
  routeState: RouteBuilderRuntimeState | null,
  isInBattle: boolean,
  isInTrainerBattle: boolean,
  isInWildBattle: boolean,
  availableStepOptions: RouteBuilderOption[],
  trainersInCurrentArea: RouteBuilderTrainer[],
  availableBattleActions: RouteBuilderResolvedBattleAction[],
  availableTrainerBattleActions: RouteBuilderTrainerBattleAction[],
  route: RouteBuilderRouteEntry[],
  onTakeOption: (targetStepId: string, option: RouteBuilderOption) => void,
  onTakeBattleAction: (action: RouteBuilderBattleAction) => void,
  onStartTrainerBattle: (trainer: RouteBuilderTrainer) => void,
  onTakeTrainerBattleAction: (action: RouteBuilderTrainerBattleAction) => void,
  onUndo: () => void,
  appendRouteEntry: (routeEntry: RouteBuilderRouteEntry) => void,
}

export const CurrentStepSection: React.FC<CurrentStepSectionProps> = ({
  currentStep,
  activeTrainerBattle,
  activeWildBattleTargetHp,
  activeTrainerBattleTargetHp,
  availableItems,
  routeState,
  isInBattle,
  isInTrainerBattle,
  isInWildBattle,
  availableStepOptions,
  trainersInCurrentArea,
  availableBattleActions,
  availableTrainerBattleActions,
  route,
  onTakeOption,
  onTakeBattleAction,
  onStartTrainerBattle,
  onTakeTrainerBattleAction,
  onUndo,
  appendRouteEntry,
}) => {
  const [isSelectingItem, setIsSelectingItem] = useState(false);

  const handleCancelItemSelection = useCallback(() => {
    setIsSelectingItem(false);
  }, []);

  const handleSelectItemTarget = useCallback((itemUsageRouteEntry: RouteBuilderRouteEntry) => {
    if (!currentStep || !routeState) return;

    // Apply item effect and create route entry
    appendRouteEntry(itemUsageRouteEntry);

    setIsSelectingItem(false);
  }, [appendRouteEntry, currentStep, routeState]);

  const handleTakeOption = useCallback((targetStepId: string, option: RouteBuilderOption) => {
    if (option.id === 'use-item') {
      setIsSelectingItem(true);
      return;
    }

    onTakeOption(targetStepId, option);
  }, [onTakeOption]);

  const handleTakeBattleAction = useCallback((action: RouteBuilderBattleAction) => {
    if (action.type === 'item') {
      setIsSelectingItem(true);
      return;
    }

    onTakeBattleAction(action);
  }, [onTakeBattleAction]);

  const handleTakeTrainerBattleAction = useCallback((action: RouteBuilderTrainerBattleAction) => {
    if (action.type === 'item') {
      setIsSelectingItem(true);
      return;
    }

    onTakeTrainerBattleAction(action);
  }, [onTakeTrainerBattleAction]);

  return (
    <PaneSection>
      <CurrentPositionCard
        currentStep={currentStep}
        activeTrainerBattle={activeTrainerBattle}
        activeWildBattleTargetHp={activeWildBattleTargetHp}
        activeTrainerBattleTargetHp={activeTrainerBattleTargetHp}
      />

      {isSelectingItem && (
      <ItemSelectionCard
        currentStep={currentStep}
        availableItems={availableItems}
        routeState={routeState}
        onCancel={handleCancelItemSelection}
        onItemUsed={handleSelectItemTarget}
      />
      )}

      {!isSelectingItem && (
      <AvailableActionsSection
        isInBattle={isInBattle}
        isInTrainerBattle={isInTrainerBattle}
        isInWildBattle={isInWildBattle}
        availableStepOptions={availableStepOptions}
        trainersInCurrentArea={trainersInCurrentArea}
        availableBattleActions={availableBattleActions}
        availableTrainerBattleActions={availableTrainerBattleActions}
        route={route}
        onTakeOption={handleTakeOption}
        onTakeBattleAction={handleTakeBattleAction}
        onStartTrainerBattle={onStartTrainerBattle}
        onTakeTrainerBattleAction={handleTakeTrainerBattleAction}
        onUndo={onUndo}
      />
      )}
    </PaneSection>
  );
};

const PaneSection = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
`;
