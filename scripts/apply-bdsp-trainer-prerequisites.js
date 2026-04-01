const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const TRAINERS_DIR = path.join(REPO_ROOT, 'resources', 'route-builder', 'trainers', 'bdsp');
const AREAS_DIR = path.join(REPO_ROOT, 'resources', 'route-builder', 'areas', 'bdsp');

const TRAINER_PREREQUISITES = {
  'trainer-id-002': {
    beatenTrainerIds: ['trainer-id-003'],
  },
  'trainer-id-271': {
    beatenTrainerIds: ['trainer-id-247'],
  },
  'trainer-id-220': {
    beatenTrainerIds: ['trainer-id-224', 'trainer-id-324'],
  },
  'trainer-id-310': {
    beatenTrainerIds: ['trainer-id-224', 'trainer-id-324'],
  },
  'trainer-id-401': {
    beatenTrainerIds: ['trainer-id-388', 'trainer-id-382', 'trainer-id-390', 'trainer-id-386', 'trainer-id-399', 'trainer-id-393', 'trainer-id-391'],
  },
  'trainer-id-312': {
    beatenTrainerIds: ['trainer-id-388', 'trainer-id-382', 'trainer-id-390', 'trainer-id-386', 'trainer-id-399', 'trainer-id-393', 'trainer-id-391'],
  },
  'trainer-id-309': {
    beatenTrainerIds: ['trainer-id-401', 'trainer-id-312'],
  },
  'trainer-id-186': {
    beatenTrainerIds: ['trainer-id-185'],
  },
  'trainer-id-187': {
    beatenTrainerIds: ['trainer-id-186'],
  },
  'trainer-id-188': {
    beatenTrainerIds: ['trainer-id-187'],
  },
  'trainer-id-191': {
    beatenTrainerIds: ['trainer-id-188'],
  },
};

const TRAINER_REQUIRED_HMS = {
  'trainer-id-005': ['rock-smash'],
  'trainer-id-006': ['rock-smash'],
  'trainer-id-007': ['rock-smash'],
  'trainer-id-008': ['rock-smash'],
  'trainer-id-009': ['rock-smash'],
  'trainer-id-010': ['rock-smash'],
  'trainer-id-118': ['surf'],
  'trainer-id-119': ['surf'],
  'trainer-id-225': ['surf'],
  'trainer-id-260': ['surf'],
  'trainer-id-136': ['surf'],
  'trainer-id-137': ['surf'],
  'trainer-id-138': ['surf'],
  'trainer-id-139': ['surf'],
  'trainer-id-140': ['surf'],
  'trainer-id-141': ['surf'],
  'trainer-id-142': ['surf'],
  'trainer-id-143': ['surf'],
  'trainer-id-144': ['surf'],
  'trainer-id-145': ['surf'],
  'trainer-id-146': ['surf'],
  'trainer-id-147': ['surf'],
  'trainer-id-363': ['surf'],
};

const AREA_TRAINER_OVERRIDES = {
  'route-202': ['trainer-id-001', 'trainer-id-003', 'trainer-id-002'],
  'route-202-first-visit': ['trainer-id-001', 'trainer-id-003', 'trainer-id-002'],
  'route-218': ['trainer-id-118', 'trainer-id-119', 'trainer-id-260', 'trainer-id-225'],
};

function mergePrerequisites(existing, additions) {
  const beatenTrainerIds = [...new Set([
    ...(existing?.beatenTrainerIds ?? []),
    ...(additions?.beatenTrainerIds ?? []),
  ])];
  const requiredHms = [...new Set([
    ...(existing?.requiredHms ?? []),
    ...(additions?.requiredHms ?? []),
  ])];

  if (beatenTrainerIds.length === 0 && requiredHms.length === 0) return undefined;

  return {
    ...(beatenTrainerIds.length > 0 ? { beatenTrainerIds } : {}),
    ...(requiredHms.length > 0 ? { requiredHms } : {}),
  };
}

function updateTrainerFiles() {
  const trainerFiles = fs.readdirSync(TRAINERS_DIR);

  trainerFiles.forEach(fileName => {
    const filePath = path.join(TRAINERS_DIR, fileName);
    const trainer = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const additions = mergePrerequisites(
      TRAINER_PREREQUISITES[trainer.id] || undefined,
      TRAINER_REQUIRED_HMS[trainer.id] ? { requiredHms: TRAINER_REQUIRED_HMS[trainer.id] } : undefined,
    );

    trainer.prerequisites = mergePrerequisites(trainer.prerequisites, additions);

    if (!trainer.prerequisites) {
      delete trainer.prerequisites;
    }

    fs.writeFileSync(filePath, `${JSON.stringify(trainer, null, 2)}\n`);
  });
}

function updateAreaFiles() {
  Object.entries(AREA_TRAINER_OVERRIDES).forEach(([areaId, trainerIds]) => {
    const filePath = path.join(AREAS_DIR, `${areaId}.json`);
    const area = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    area.trainerIds = trainerIds;
    fs.writeFileSync(filePath, `${JSON.stringify(area, null, 2)}\n`);
  });
}

function main() {
  updateTrainerFiles();
  updateAreaFiles();
  console.log('Applied BDSP trainer prerequisites and area corrections.');
}

main();
