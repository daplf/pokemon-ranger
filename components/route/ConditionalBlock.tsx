import React, { useMemo } from 'react';
import styled from 'styled-components';
import { ErrorCard } from './ErrorCard';
import { RouteContext } from '../../reducers/route/reducer';
import { calculateAllPossibleIVRanges, calculatePossibleNature } from '../../utils/trackerCalculations';
import { BorderlessCard, Card, CardVariant, ContainerLabel, variantIsBorderless } from '../Layout';
import { parse, Terms } from '../../directives/conditional-grammar';
import { castRouteVariableAsType, evaluateCondition, formatCondition } from '../../directives/evaluateCondition';
import { ErrorableResult, evaluateAsThrowableOptional } from '../../utils/utils';

interface ConditionalBlockProps {
  source?: string;
  condition?: string;
  level?: string;
  evolution?: string;
  theme?: string;
}

export const ConditionalBlock: React.FC<ConditionalBlockProps> = ({
  source,
  condition,
  level: rawLevel,
  evolution: rawEvolution = '0',
  theme = 'borderless',
  children,
}) => {
  const state = RouteContext.useState();
  const tracker = source && state.trackers[source];

  const ivRanges = useMemo(() => (
    tracker && calculateAllPossibleIVRanges(tracker)
  ), [tracker]);
  const confirmedNatures = useMemo(() => tracker && ivRanges && calculatePossibleNature(ivRanges, tracker), [ivRanges, tracker]);
  
  const variableValues = useMemo(() => (
    Object.entries(state.variables).reduce((acc, [key, { type, value }]) => ({
      ...acc,
      [key]: castRouteVariableAsType(type, value),
    }), {})
  ), [state.variables]);

  const parsedCondition: ErrorableResult<Terms.Expression> | null = useMemo(() => {
    if (!condition) return null;

    return evaluateAsThrowableOptional<Terms.Expression>(() => parse(condition));
  }, [condition]);

  const result = useMemo(() => {
    if (!ivRanges || !condition || !source || !confirmedNatures || !parsedCondition) return null;
  
    const level = Number(rawLevel);
    const evolution = Number(rawEvolution);

    try {
      if (parsedCondition.error) {
        return {
          error: true,
          message: `${condition} is not a valid conditional statement: ${parsedCondition.message}`,
        };
      }

      return {
        error: false,
        result: evaluateCondition(
          parsedCondition.value,
          level,
          ivRanges,
          confirmedNatures,
          state.trackers[source],
          evolution,
          variableValues,
        ),
      };
    } catch (e) {
      return {
        error: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: `${condition} is not a valid conditional statement: ${(e as any).message}`,
      };
    }
  }, [condition, parsedCondition, rawLevel, rawEvolution, ivRanges, confirmedNatures, state.trackers, source, variableValues]);

  if (!source) return <ErrorCard>The source attribute must be specified.</ErrorCard>;
  if (!condition || !parsedCondition) return <ErrorCard>The condition attribute must be specified.</ErrorCard>;
  if (!ivRanges || !confirmedNatures) return <ErrorCard>No IV table with the name {source} exists.</ErrorCard>;

  if (result?.error) return <ErrorCard>{result.message}</ErrorCard>;
  if (parsedCondition?.error) return <ErrorCard>{parsedCondition.error}</ErrorCard>;

  const variant = theme as CardVariant;
  const CardComponent = variantIsBorderless(theme) ? BorderlessConditionalCard : ConditionalCard;

  return result?.result ? (
    <CardComponent variant={variant}>
      <Condition>
        Condition met:
        <b>&nbsp;{formatCondition(parsedCondition.value)}{rawLevel && ` at Lv. ${rawLevel}`}</b>
      </Condition>
      {children}
    </CardComponent>
  ) : null;
};

const Condition = styled.div`
  width: 100%;
  text-align: right;
  font-size: 0.875rem;
`;

const ConditionalCard = styled(Card)`
  padding-top: 0.25rem;

  & > ${Condition} + p {
    margin-top: 0.5rem;
  }
`;

const BorderlessConditionalCard = styled(BorderlessCard)`
  position: relative;

  h4 + & ${Condition},
  ul + & ${Condition} {
    top: -0.5rem;
  }

  ${ContainerLabel} + & {
    padding-top: 1rem;

    & ${Condition} {
      margin-top: -0.5rem;
    }
  }

  & ${Condition} {
    position: absolute;
    width: max-content;
    top: 0;
    right: 0;
    max-width: 40%;
    overflow-x: auto;
    white-space: nowrap;
    padding: 0.5rem;
    border-radius: 0.25rem;
    background-color: rgba(255, 255, 255, 0.5);

    & + ul {
      margin-top: -1rem;
    }
  }

  & + & {
    margin-top: 0.5rem;
    border-top: 1px solid #ccc;
    padding-top: 1.5rem;
  }

  & > ul:last-child {
    margin-bottom: 0;
  }

  h4 + & + ul,
  ul + & + ul,
  ul + & + & + ul,
  ul + & + & + & + ul {
    margin-top: 0;
  }
`;
