import React from 'react';
import styled from 'styled-components';
import { Card, InputSubheader } from '../../components/Layout';
import { RouteBuilderStep, RouteBuilderActiveTrainerBattle } from '../../utils/route-builder';

interface CurrentPositionCardProps {
  currentStep: RouteBuilderStep | null;
  activeTrainerBattle: RouteBuilderActiveTrainerBattle | null;
  activeWildBattleTargetHp: string | null;
  activeTrainerBattleTargetHp: string | null;
}

/**
 * CurrentPositionCard Component
 * 
 * Displays where the trainer currently is:
 * - Current step/location
 * - Step description
 * - If in a wild battle: opponent species and level
 * - If in a trainer battle: opponent trainer name and selected Pokémon
 */
export const CurrentPositionCard: React.FC<CurrentPositionCardProps> = ({
  currentStep,
  activeTrainerBattle,
  activeWildBattleTargetHp,
  activeTrainerBattleTargetHp,
}) => {
  if (!currentStep) return null;

  return (
    <>
      <InputSubheader>Current Position</InputSubheader>
      <StyledCard variant="info">
        <h3>{currentStep.name}</h3>
        <p>{currentStep.description}</p>
        {activeTrainerBattle && (
          <BattleStatusText>
            Battling {activeTrainerBattle.trainer.name}
            {activeTrainerBattle.selectedPokemonIndex !== null && (
              <>
                {' '}against {activeTrainerBattle.trainer.pokemon[activeTrainerBattle.selectedPokemonIndex].species} Lv. {activeTrainerBattle.trainer.pokemon[activeTrainerBattle.selectedPokemonIndex].level}
                {activeTrainerBattleTargetHp && (
                  <> ({activeTrainerBattleTargetHp})</>
                )}
              </>
            )}
          </BattleStatusText>
        )}
        {!activeTrainerBattle && currentStep.battle?.opponent && (
          <BattleStatusText>
            Wild {currentStep.battle.opponent.species} Lv. {currentStep.battle.opponent.level}
            {activeWildBattleTargetHp && (
              <> ({activeWildBattleTargetHp})</>
            )}
          </BattleStatusText>
        )}
      </StyledCard>
    </>
  );
};

const StyledCard = styled(Card)`
  margin-top: 0;
`;

const BattleStatusText = styled.div`
  color: ${({ theme }) => theme.label};
  margin-bottom: 1rem;
`;
