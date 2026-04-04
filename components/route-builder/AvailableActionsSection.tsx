import React from 'react';
import styled from 'styled-components';
import { Card, InputSubheader } from '../../components/Layout';
import { Button } from '../../components/Button';
import {
  RouteBuilderOption,
  RouteBuilderResolvedBattleAction,
  RouteBuilderTrainer,
  RouteBuilderTrainerBattleAction,
} from '../../utils/route-builder';

interface AvailableActionsSectionProps {
  isInBattle: boolean;
  isInTrainerBattle: boolean;
  isInWildBattle: boolean;
  availableStepOptions: RouteBuilderOption[];
  trainersInCurrentArea: RouteBuilderTrainer[];
  availableBattleActions: RouteBuilderResolvedBattleAction[];
  availableTrainerBattleActions: RouteBuilderTrainerBattleAction[];
  route: any[];
  onTakeOption?: (targetStepId: string, option: RouteBuilderOption) => void;
  onTakeBattleAction?: (action: RouteBuilderResolvedBattleAction) => void;
  onStartTrainerBattle?: (trainer: RouteBuilderTrainer) => void;
  onTakeTrainerBattleAction?: (action: RouteBuilderTrainerBattleAction) => void;
  onUndo?: () => void;
}

/**
 * AvailableActionsSection Component
 * 
 * Displays all possible actions the player can take from the current position.
 * Changes based on battle state:
 * - Not in battle: Show step options and available trainers
 * - Wild battle: Show battle actions for current wild Pokémon
 * - Trainer battle: Show Pokémon selection, moves, and KO options
 */
export const AvailableActionsSection: React.FC<AvailableActionsSectionProps> = ({
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
}) => {
  return (
    <Container>
      <SectionHeaderRow>
        <InputSubheader>{isInBattle ? 'Battle Actions' : 'Available Actions'}</InputSubheader>
        <Button onClick={onUndo} disabled={route.length <= 1}>Undo</Button>
      </SectionHeaderRow>

      {!isInBattle && availableStepOptions.length === 0 && trainersInCurrentArea.length === 0 && (
        <Card variant="warning">
          <h3>No further actions are defined here yet.</h3>
          <p>This is the end of the current prototype branch.</p>
        </Card>
      )}

      <OptionsList>
        {/* Step Options */}
        {!isInBattle && availableStepOptions.map(option => (
          <OptionCard key={option.id} variant="borderless">
            <div>
              <OptionTitle>{option.label}</OptionTitle>
              {option.description && <OptionDescription>{option.description}</OptionDescription>}
            </div>
            <Button onClick={() => onTakeOption?.(option.targetStepId, option)}>Take Step</Button>
          </OptionCard>
        ))}

        {/* Wild Battle Actions */}
        {isInWildBattle && availableBattleActions.map(action => (
          <OptionCard key={action.id} variant="borderless">
            <div>
              <OptionTitle>{action.label}</OptionTitle>
              {action.description && <OptionDescription>{action.description}</OptionDescription>}
              {'damageDetails' in action && action.damageDetails && action.damageDetails.length > 0 && (
                <DamageDetailList>
                  {action.damageDetails.map((detail, index) => (
                    <DamageDetail key={`${action.id}-${index}`}>{detail}</DamageDetail>
                  ))}
                </DamageDetailList>
              )}
              {'damageSummary' in action && action.damageSummary && (!('damageDetails' in action) || !action.damageDetails || action.damageDetails.length === 0) && (
                <OptionDescription>{action.damageSummary}</OptionDescription>
              )}
            </div>
            <Button onClick={() => onTakeBattleAction?.(action)}>
              {action.type === 'ko' ? 'End Battle' : action.type === 'item' ? 'Use Item' : 'Use Move'}
            </Button>
          </OptionCard>
        ))}

        {/* Trainer Battle Actions */}
        {isInTrainerBattle && availableTrainerBattleActions.map(action => (
          <OptionCard key={action.id} variant="borderless">
            <div>
              <OptionTitle>{action.label}</OptionTitle>
              {action.description && <OptionDescription>{action.description}</OptionDescription>}
              {action.damageDetails && action.damageDetails.length > 0 && (
                <DamageDetailList>
                  {action.damageDetails.map((detail, index) => (
                    <DamageDetail key={`${action.id}-${index}`}>{detail}</DamageDetail>
                  ))}
                </DamageDetailList>
              )}
              {action.damageSummary && (!action.damageDetails || action.damageDetails.length === 0) && (
                <OptionDescription>{action.damageSummary}</OptionDescription>
              )}
            </div>
            <Button onClick={() => onTakeTrainerBattleAction?.(action)}>
              {getTrainerBattleButtonLabel(action)}
            </Button>
          </OptionCard>
        ))}

        {/* Available Trainers */}
        {!isInBattle && trainersInCurrentArea.map(trainer => (
          <OptionCard key={trainer.id} variant="borderless">
            <div>
              <OptionTitle>Battle {trainer.name}</OptionTitle>
              <OptionDescription>{trainer.pokemon.map(pokemon => `${pokemon.species} Lv. ${pokemon.level}`).join(', ')}</OptionDescription>
            </div>
            <Button onClick={() => onStartTrainerBattle?.(trainer)}>Start Battle</Button>
          </OptionCard>
        ))}
      </OptionsList>
    </Container>
  );
};

function getTrainerBattleButtonLabel(action: RouteBuilderTrainerBattleAction): string {
  if (action.type === 'selectPokemon') return 'Choose Pokemon';
  if (action.type === 'ko') return 'KO Pokemon';
  if (action.type === 'item') return 'Use Item';

  return 'Use Move';
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const SectionHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

const OptionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const OptionCard = styled(Card)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.input.border};
`;

const OptionTitle = styled.div`
  font-weight: 700;
  color: ${({ theme }) => theme.foreground};
`;

const OptionDescription = styled.div`
  color: ${({ theme }) => theme.label};
  margin-top: 0.25rem;
`;

const DamageDetailList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-top: 0.5rem;
`;

const DamageDetail = styled.div`
  color: ${({ theme }) => theme.label};
  font-size: 0.85rem;
  font-family: monospace;
`;
