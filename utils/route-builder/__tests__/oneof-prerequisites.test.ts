import { prerequisitesAreMet } from '../stateManagement';

describe('OneOf Generalized Prerequisites', () => {
  describe('oneOf with trainers', () => {
    it('shows option when first oneOf trainer is defeated', () => {
      const result = prerequisitesAreMet(
        { oneOf: [
          { beatenTrainerIds: ['trainer-176'] },
          { beatenTrainerIds: ['trainer-177'] },
          { beatenTrainerIds: ['trainer-178'] },
        ] },
        ['trainer-176'],
        [],
        {},
      );
      expect(result).toBe(true);
    });

    it('shows option when second oneOf trainer is defeated', () => {
      const result = prerequisitesAreMet(
        { oneOf: [
          { beatenTrainerIds: ['trainer-176'] },
          { beatenTrainerIds: ['trainer-177'] },
          { beatenTrainerIds: ['trainer-178'] },
        ] },
        ['trainer-177'],
        [],
        {},
      );
      expect(result).toBe(true);
    });

    it('hides option when none of the oneOf trainers is defeated', () => {
      const result = prerequisitesAreMet(
        { oneOf: [
          { beatenTrainerIds: ['trainer-176'] },
          { beatenTrainerIds: ['trainer-177'] },
          { beatenTrainerIds: ['trainer-178'] },
        ] },
        [],
        [],
        {},
      );
      expect(result).toBe(false);
    });
  });

  describe('oneOf with mixed prerequisite types', () => {
    it('allows access if any oneOf prerequisite is met - trainer case', () => {
      const result = prerequisitesAreMet(
        { oneOf: [
          { beatenTrainerIds: ['trainer-176'] },
          { requiredHms: ['surf'] },
          { requiredItems: ['Poke Ball'] },
        ] },
        ['trainer-176'],
        [],
        {},
      );
      expect(result).toBe(true);
    });

    it('allows access if any oneOf prerequisite is met - HM case', () => {
      const result = prerequisitesAreMet(
        { oneOf: [
          { beatenTrainerIds: ['trainer-176'] },
          { requiredHms: ['surf'] },
          { requiredItems: ['Poke Ball'] },
        ] },
        [],
        ['surf'],
        {},
      );
      expect(result).toBe(true);
    });

    it('allows access if any oneOf prerequisite is met - item case', () => {
      const result = prerequisitesAreMet(
        { oneOf: [
          { beatenTrainerIds: ['trainer-176'] },
          { requiredHms: ['surf'] },
          { requiredItems: ['Poke Ball'] },
        ] },
        [],
        [],
        { 'Poke Ball': 1 },
      );
      expect(result).toBe(true);
    });

    it('denies access if none of the oneOf prerequisites are met', () => {
      const result = prerequisitesAreMet(
        { oneOf: [
          { beatenTrainerIds: ['trainer-176'] },
          { requiredHms: ['surf'] },
          { requiredItems: ['Poke Ball'] },
        ] },
        [],
        [],
        {},
      );
      expect(result).toBe(false);
    });
  });

  describe('combining AND and OR logic', () => {
    it('requires mandatory trainer AND (any one of optional trainers/HM/item)', () => {
      const result = prerequisitesAreMet(
        {
          beatenTrainerIds: ['trainer-1'],
          oneOf: [
            { beatenTrainerIds: ['trainer-176'] },
            { requiredHms: ['surf'] },
          ],
        },
        ['trainer-1', 'trainer-176'],
        [],
        {},
      );
      expect(result).toBe(true);
    });

    it('fails if mandatory trainer is not beaten despite oneOf being met', () => {
      const result = prerequisitesAreMet(
        {
          beatenTrainerIds: ['trainer-1'],
          oneOf: [
            { beatenTrainerIds: ['trainer-176'] },
            { requiredHms: ['surf'] },
          ],
        },
        ['trainer-176'],
        [],
        {},
      );
      expect(result).toBe(false);
    });

    it('fails if oneOf is not met despite mandatory trainer being beaten', () => {
      const result = prerequisitesAreMet(
        {
          beatenTrainerIds: ['trainer-1'],
          oneOf: [
            { beatenTrainerIds: ['trainer-176'] },
            { requiredHms: ['surf'] },
          ],
        },
        ['trainer-1'],
        [],
        {},
      );
      expect(result).toBe(false);
    });
  });

  describe('nested oneOf (recursive)', () => {
    it('handles nested oneOf prerequisites', () => {
      const result = prerequisitesAreMet(
        {
          oneOf: [
            {
              beatenTrainerIds: ['trainer-1'],
              oneOf: [
                { requiredHms: ['surf'] },
                { requiredHms: ['fly'] },
              ],
            },
            { requiredItems: ['Master Ball'] },
          ],
        },
        ['trainer-1'],
        ['surf'],
        {},
      );
      expect(result).toBe(true);
    });

    it('nested oneOf fails when neither inner nor outer conditions are met', () => {
      const result = prerequisitesAreMet(
        {
          oneOf: [
            {
              beatenTrainerIds: ['trainer-1'],
              oneOf: [
                { requiredHms: ['surf'] },
                { requiredHms: ['fly'] },
              ],
            },
            { requiredItems: ['Master Ball'] },
          ],
        },
        ['trainer-1'],
        [],
        {},
      );
      expect(result).toBe(false);
    });
  });

  describe('without oneOf - backwards compatibility', () => {
    it('works with just beatenTrainerIds (no oneOf)', () => {
      const result = prerequisitesAreMet(
        { beatenTrainerIds: ['trainer-176', 'trainer-177'] },
        ['trainer-176', 'trainer-177'],
        [],
        {},
      );
      expect(result).toBe(true);
    });

    it('works with just HMs (no oneOf)', () => {
      const result = prerequisitesAreMet(
        { requiredHms: ['surf', 'fly'] },
        [],
        ['surf', 'fly'],
        {},
      );
      expect(result).toBe(true);
    });

    it('combines multiple AND conditions without oneOf', () => {
      const result = prerequisitesAreMet(
        {
          beatenTrainerIds: ['trainer-176'],
          requiredItems: ['Poke Ball'],
          requiredHms: ['surf'],
        },
        ['trainer-176'],
        ['surf'],
        { 'Poke Ball': 1 },
      );
      expect(result).toBe(true);
    });
  });

  describe('complex real-world scenarios', () => {
    it('Route 203: beat rival OR have specific item', () => {
      const result = prerequisitesAreMet(
        {
          oneOf: [
            { beatenTrainerIds: ['trainer-id-176'] },
            { requiredItems: ['Badge of Challenge'] },
          ],
        },
        [],
        [],
        { 'Badge of Challenge': 1 },
      );
      expect(result).toBe(true);
    });

    it('Cave entrance: must have HM but choice of which trainer to beat + HM', () => {
      const result = prerequisitesAreMet(
        {
          requiredHms: ['flash'],
          oneOf: [
            { beatenTrainerIds: ['trainer-mine-boss-1'] },
            { beatenTrainerIds: ['trainer-mine-boss-2'] },
          ],
        },
        ['trainer-mine-boss-1'],
        ['flash'],
        {},
      );
      expect(result).toBe(true);
    });

    it('complex: mandatory level + (choice of HM or trainer) + badge', () => {
      const result = prerequisitesAreMet(
        {
          beatenTrainerIds: ['trainer-gym-leader'],
          requiredItems: ['Badge'],
          oneOf: [
            { requiredHms: ['strength'] },
            { beatenTrainerIds: ['trainer-alternative-path'] },
          ],
        },
        ['trainer-gym-leader', 'trainer-alternative-path'],
        [],
        { Badge: 1 },
      );
      expect(result).toBe(true);
    });
  });
});
