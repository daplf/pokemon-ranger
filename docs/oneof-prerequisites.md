# OneOf Prerequisite Rules

## Overview

The prerequisite system now supports `oneOf` rules that enforce OR logic for **any type of prerequisite condition**. This allows you to specify that a player can access content if **any one** of a list of prerequisite conditions is met, rather than requiring all of them. This applies to trainers, HMs, items, progression flags, or any combination.

## Use Cases

- **Route gating**: Gate a route to require defeating any one of multiple rival trainers
- **Multiple access paths**: Players can use either Surf HM OR defeat a specific trainer to access an area
- **Content branching**: Give players multiple paths (different trainers, items, or HMs) to unlock the same content
- **Flexible progression**: Allow different progression routes through the game with varied requirements

## Syntax

### Basic oneOf with single prerequisite type

```json
{
  "id": "trainer-id-004",
  "name": "Route 203 Trainer",
  "prerequisites": {
    "oneOf": [
      { "beatenTrainerIds": ["trainer-id-176"] },
      { "beatenTrainerIds": ["trainer-id-177"] },
      { "beatenTrainerIds": ["trainer-id-178"] }
    ]
  },
  "pokemon": [...]
}
```

This trainer can be fought if the player has defeated **any one** of trainers 176, 177, or 178.

### oneOf with mixed prerequisite types

```json
{
  "id": "cave-entrance",
  "prerequisites": {
    "oneOf": [
      { "beatenTrainerIds": ["trainer-cave-guardian"] },
      { "requiredHms": ["strength"] },
      { "requiredItems": ["Cave Pass"] }
    ]
  }
}
```

This cave can be entered if the player has **any one** of:
- Defeated the cave guardian trainer
- Unlocked the Strength HM
- Obtained a Cave Pass

### Combining AND and OR logic

```json
{
  "id": "trainer-id-271",
  "prerequisites": {
    "beatenTrainerIds": ["trainer-id-247"],
    "oneOf": [
      { "beatenTrainerIds": ["trainer-id-176"] },
      { "beatenTrainerIds": ["trainer-id-177"] },
      { "beatenTrainerIds": ["trainer-id-178"] }
    ]
  }
}
```

This trainer can be fought if:
- **AND**: The player has defeated trainer 247, **AND**
- **OR**: The player has defeated any one of trainers 176, 177, or 178

### Full prerequisite example with all fields

```json
{
  "prerequisites": {
    "beatenTrainerIds": ["trainer-id-1"],
    "requiredHms": ["surf"],
    "requiredItems": ["Pokéball"],
    "oneOf": [
      { "beatenTrainerIds": ["trainer-id-176"] },
      { "beatenTrainerIds": ["trainer-id-177"] },
      { "progressionFlags": { "hasMainBadge": true } }
    ],
    "excludedItems": ["MasterBall"],
    "progressionFlags": { "pickedStarter": true }
  }
}
```

This requires **ALL** of:
- Defeated trainer-1 **AND**
- Unlocked Surf **AND**
- Have Pokéball in bag **AND**
- **ANY ONE** of: (beat trainer 176 OR beat trainer 177 OR have main badge) **AND**
- Not have MasterBall **AND**
- Picked starter Pokémon

### Nested oneOf (recursive)

```json
{
  "prerequisites": {
    "oneOf": [
      {
        "beatenTrainerIds": ["trainer-gym-leader"],
        "oneOf": [
          { "requiredHms": ["strength"] },
          { "requiredHms": ["waterfall"] }
        ]
      },
      { "requiredItems": ["Secret Key"] }
    ]
  }
}
```

This requires **ANY ONE** of:
1. Beat the gym leader **AND** (have Strength OR have Waterfall)
2. Have the Secret Key

## Route 203 Example

Currently, Route 203 uses `oneOf` prerequisites to gate trainers. After defeating **any one** of:
- Pokémon Trainer Cedric (trainer-id-176)
- Pokémon Trainer (trainer-id-177)
- Pokémon Trainer (trainer-id-178)

Players can then battle:
- Youngster Michael (trainer-id-004)
- Lass Kaitlin (trainer-id-247)
- Youngster Dallas (trainer-id-270)
- Lass Madeline (trainer-id-246)
- Youngster Sebastian (trainer-id-271) - also requires defeating Lass Kaitlin first

## Implementation Details

### Type Definition (types.ts)

```typescript
export interface RouteBuilderPrerequisites {
  // ALL of these trainers must be beaten (AND logic)
  beatenTrainerIds?: string[];
  
  // ALL of these HMs must be unlocked (AND logic)
  requiredHms?: RouteBuilderHm[];
  
  // ALL of these items must be in bag (AND logic)
  requiredItems?: string[];
  
  // NONE of these items can be in bag (AND logic)
  excludedItems?: string[];
  
  // ALL of these flags must match (AND logic)
  progressionFlags?: Record<string, boolean | string | number>;
  
  // ANY ONE of these prerequisite sets must be fully met (OR logic) - RECURSIVE
  oneOf?: RouteBuilderPrerequisites[];
}
```

The `oneOf` field is recursive - each prerequisite set within `oneOf` can itself have another `oneOf` field, allowing for complex nested conditions.

### Logic (stateManagement.ts)

The `prerequisitesAreMet()` function evaluates prerequisites as follows:

```
prerequisitesMet = 
  all(beatenTrainerIds ⊆ defeatedTrainers) AND          // ALL required trainers beaten
  any(oneOf is fully met) AND                            // AT LEAST ONE oneOf set fully met
  all(requiredHms) AND                                   // All HMs unlocked
  all(requiredItems) AND                                 // All items in bag
  none(excludedItems) AND                                // No excluded items in bag
  all(progressionFlags match)                            // All flags match
```

With recursion, oneOf prerequisites are evaluated the same way: each prerequisite set in `oneOf` must be fully evaluated before determining if it's met.

## Testing

Comprehensive test coverage in `utils/route-builder/__tests__/oneof-prerequisites.test.ts`:

**Basic oneOf training:**
- ✓ Shows option when first/second/third oneOf trainer is defeated
- ✓ Hides option when none of the oneOf trainers is defeated

**Mixed prerequisite types:**
- ✓ Allows access if any oneOf prerequisite is met (trainer, HM, or item case)
- ✓ Denies access if none of the oneOf prerequisites are met

**Combining AND and OR:**
- ✓ Requires mandatory trainer AND (any one of optional trainers/HM/item)
- ✓ Fails if mandatory trainer not met despite oneOf being met
- ✓ Fails if oneOf not met despite mandatory trainer being met

**Nested oneOf (recursion):**
- ✓ Handles nested oneOf prerequisites correctly
- ✓ Fails when neither inner nor outer conditions are met

**Backwards compatibility:**
- ✓ Works with just beatenTrainerIds (no oneOf)
- ✓ Works with just HMs (no oneOf)
- ✓ Combines multiple AND conditions without oneOf

**Real-world scenarios:**
- ✓ Route 203: beat rival OR have specific item
- ✓ Cave entrance: must have HM but choice of multiple trainers + HM
- ✓ Complex scenario: mandatory level + (choice of HM or trainer) + badge

All 18 tests pass with 100% coverage of the feature.

## Migration Guide

### Simple trainer-list oneOf → Generalized oneOf

**Before:**
```json
{
  "prerequisites": {
    "beatenTrainerIds": ["trainer-1", "trainer-2", "trainer-3"]
  }
}
```

**After** (any one of the three):
```json
{
  "prerequisites": {
    "oneOf": [
      { "beatenTrainerIds": ["trainer-1"] },
      { "beatenTrainerIds": ["trainer-2"] },
      { "beatenTrainerIds": ["trainer-3"] }
    ]
  }
}
```

### Adding mixed conditions

**Original:**
```json
{
  "prerequisites": {
    "beatenTrainerIds": ["trainer-1"],
    "oneOfTrainerIds": ["trainer-100", "trainer-101"]
  }
}
```

**Updated with mixed oneOf:**
```json
{
  "prerequisites": {
    "beatenTrainerIds": ["trainer-1"],
    "oneOf": [
      { "beatenTrainerIds": ["trainer-100"] },
      { "requiredHms": ["strength"] },
      { "requiredItems": ["Medal"] }
    ]
  }
}
```

## Complex Real-World Examples

### Multi-path cave access
```json
{
  "prerequisites": {
    "requiredItems": ["Flashlight"],
    "oneOf": [
      { "requiredHms": ["flash"] },
      { "beatenTrainerIds": ["cave-guardian"] },
      { "progressionFlags": { "torchEquipped": true } }
    ]
  }
}
```
Requires flashlight AND any of: have Flash HM, beat cave guardian, or torch equipped.

### Conditional gym access
```json
{
  "prerequisites": {
    "oneOf": [
      { "beatenTrainerIds": ["rival-1", "rival-2"] },
      { "requiredItems": ["Gym Badge"] },
      { "progressionFlags": { "gymChallengeCompleted": true } }
    ]
  }
}
```
Access gym if you've beaten both rivals, OR have the gym badge, OR completed the challenge.

### Mountain passage with multiple routes
```json
{
  "prerequisites": {
    "oneOf": [
      {
        "requiredHms": ["rock-smash"],
        "beatenTrainerIds": ["mountain-guide"]
      },
      {
        "requiredHms": ["strength", "fly"]
      },
      {
        "requiredItems": ["Secret Pass"]
      }
    ]
  }
}
```
Pass the mountain if you have ANY of:
1. Rock Smash HM AND beat the mountain guide
2. Both Strength and Fly HMs
3. Secret Pass item
