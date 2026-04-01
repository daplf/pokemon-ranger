const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO_ROOT = path.resolve(__dirname, '..');
const BDSP_CONFIG_PATH = path.join(REPO_ROOT, 'resources', 'route-builder', 'bdsp.json');
const TRAINERS_DIR = path.join(REPO_ROOT, 'resources', 'route-builder', 'trainers', 'bdsp');
const AREAS_DIR = path.join(REPO_ROOT, 'resources', 'route-builder', 'areas', 'bdsp');
const INDEX_DIR = path.join(REPO_ROOT, 'resources', 'route-builder');
const TRAINER_INDEX_PATH = path.join(INDEX_DIR, 'bdsp-trainer-index.json');
const AREA_INDEX_PATH = path.join(INDEX_DIR, 'bdsp-area-index.json');

const TRAINER_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1_uRpnFWroeCY3RaRi4lXeS9uZEDXiRIMBtTQVGrIZ3w/export?format=csv&gid=773204596';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        resolve(fetchText(response.headers.location));
        response.resume();
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Unexpected HTTP ${response.statusCode} when fetching ${url}`));
        response.resume();
        return;
      }

      const chunks = [];

      response.setEncoding('utf8');
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(chunks.join('')));
    }).on('error', reject);
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(value);
      value = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && nextChar === '\n') i += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeText(value) {
  return (value || '').trim();
}

function parseNumber(value) {
  const normalized = normalizeText(value);
  return normalized ? Number(normalized) : 0;
}

function parseMoveList(value) {
  return normalizeText(value)
    .split(' / ')
    .map(item => item.trim())
    .filter(Boolean);
}

function buildTrainerFileName(trainerId, trainerName) {
  return `${String(trainerId).padStart(3, '0')}-${slugify(trainerName)}.json`;
}

function parseTrainerRows(rows) {
  const trainers = [];
  let currentTrainer = null;

  rows.forEach(columns => {
    const colB = normalizeText(columns[1]);
    const colD = normalizeText(columns[3]);

    if (!colB) return;

    const trainerMatch = colB.match(/^Trainer ID (\d+)$/i);

    if (trainerMatch) {
      if (currentTrainer) trainers.push(currentTrainer);

      currentTrainer = {
        id: `trainer-id-${String(trainerMatch[1]).padStart(3, '0')}`,
        trainerId: Number(trainerMatch[1]),
        game: 'bdsp',
        name: colD,
        pokemon: [],
      };

      return;
    }

    if (!currentTrainer) return;

    currentTrainer.pokemon.push({
      species: colB,
      level: parseNumber(columns[3]),
      ability: normalizeText(columns[4]) || undefined,
      item: normalizeText(columns[6]) || undefined,
      moves: parseMoveList(columns[7]),
      nature: normalizeText(columns[8]) || undefined,
      evs: {
        hp: parseNumber(columns[9]),
        attack: parseNumber(columns[10]),
        defense: parseNumber(columns[11]),
        specialAttack: parseNumber(columns[12]),
        specialDefense: parseNumber(columns[13]),
        speed: parseNumber(columns[14]),
      },
      ivs: {
        hp: parseNumber(columns[15]),
        attack: parseNumber(columns[16]),
        defense: parseNumber(columns[17]),
        specialAttack: parseNumber(columns[18]),
        specialDefense: parseNumber(columns[19]),
        speed: parseNumber(columns[20]),
      },
    });
  });

  if (currentTrainer) trainers.push(currentTrainer);

  return trainers;
}

function buildAreaFiles() {
  const bdspConfig = JSON.parse(fs.readFileSync(BDSP_CONFIG_PATH, 'utf8'));
  const areaIndex = bdspConfig.steps.map(step => {
    const areaFileName = `${step.id}.json`;
    const areaFilePath = path.join(AREAS_DIR, areaFileName);
    const areaData = {
      id: step.id,
      game: 'bdsp',
      name: step.name,
      trainerIds: [],
    };

    fs.writeFileSync(areaFilePath, `${JSON.stringify(areaData, null, 2)}\n`);

    return {
      id: step.id,
      name: step.name,
      file: `areas/bdsp/${areaFileName}`,
    };
  });

  fs.writeFileSync(AREA_INDEX_PATH, `${JSON.stringify(areaIndex, null, 2)}\n`);
}

async function main() {
  ensureDir(TRAINERS_DIR);
  ensureDir(AREAS_DIR);

  const csvText = await fetchText(TRAINER_SHEET_CSV_URL);
  const rows = parseCsv(csvText);
  const trainers = parseTrainerRows(rows);

  const trainerIndex = trainers.map(trainer => {
    const fileName = buildTrainerFileName(trainer.trainerId, trainer.name);
    const filePath = path.join(TRAINERS_DIR, fileName);

    fs.writeFileSync(filePath, `${JSON.stringify(trainer, null, 2)}\n`);

    return {
      id: trainer.id,
      trainerId: trainer.trainerId,
      name: trainer.name,
      file: `trainers/bdsp/${fileName}`,
    };
  });

  fs.writeFileSync(TRAINER_INDEX_PATH, `${JSON.stringify(trainerIndex, null, 2)}\n`);
  buildAreaFiles();

  console.log(`Generated ${trainers.length} trainer files.`);
  console.log(`Generated ${JSON.parse(fs.readFileSync(BDSP_CONFIG_PATH, 'utf8')).steps.length} area files.`);
  console.log('Area files were scaffolded with empty trainerIds because the provided trainer sheet does not include area membership.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
