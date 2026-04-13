import React, { useState } from 'react';
import styled from 'styled-components';
import { Button } from '../Button';
import { InputSubheader } from '../Layout';

interface BagSectionProps {
  bag: Record<string, number>;
}

/**
 * BagSection Component
 *
 * Displays items collected during the route.
 * Can be expanded/collapsed to save space.
 */
export const BagSection: React.FC<BagSectionProps> = ({
  bag,
}) => {
  const [isBagExpanded, setIsBagExpanded] = useState(false);

  return (
    <Container>
      <BagHeaderRow>
        <InputSubheader>Bag</InputSubheader>
        <Button onClick={() => setIsBagExpanded(!isBagExpanded)}>
          {isBagExpanded ? 'Hide' : 'Show'}
        </Button>
      </BagHeaderRow>
      {isBagExpanded && (
        Object.keys(bag).length > 0 ? (
          <BagList>
            {Object.entries(bag).map(([itemName, quantity]) => (
              <BagItem key={itemName}>
                <BagItemName>{itemName}</BagItemName>
                <BagItemQty>x{quantity}</BagItemQty>
              </BagItem>
            ))}
          </BagList>
        ) : (
          <BagEmpty>No items in bag</BagEmpty>
        )
      )}
    </Container>
  );
};

const Container = styled.div`
  margin-bottom: 0.75rem;
`;

const BagHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
`;

const BagList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.5rem;
`;

const BagItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.input.border};
  border-radius: 0.35rem;
`;

const BagItemName = styled.div`
  font-weight: 700;
`;

const BagItemQty = styled.div`
  color: ${({ theme }) => theme.label};
`;

const BagEmpty = styled.div`
  color: ${({ theme }) => theme.label};
  margin-top: 0.5rem;
  font-style: italic;
`;
