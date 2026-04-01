const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO_ROOT = path.resolve(__dirname, '..');
const TRAINER_INDEX_PATH = path.join(REPO_ROOT, 'resources', 'route-builder', 'bdsp-trainer-index.json');
const TRAINERS_DIR = path.join(REPO_ROOT, 'resources', 'route-builder', 'trainers', 'bdsp');
const AREA_INDEX_PATH = path.join(REPO_ROOT, 'resources', 'route-builder', 'bdsp-area-index.json');
const AREAS_DIR = path.join(REPO_ROOT, 'resources', 'route-builder', 'areas', 'bdsp');

const PAGE_SLUG_BY_AREA_ID = {
  'route-202': 'route-202',
  'route-202-first-visit': 'route-202',
  'route-203': 'route-203',
  'oreburgh-mine': 'oreburgh-coal-mine',
  'route-204-south': 'route-204',
  'route-204-north': 'route-204',
  'floaroma-town': 'floaroma-town',
  'valley-windworks': 'valley-windworks',
  'route-205-south': 'route-205',
  'route-205-north': 'route-205',
  'eterna-forest': 'eterna-forest',
  'eterna-city': 'eterna-city',
  'old-chateau': 'old-chateau',
  'route-206': 'route-206-cycling-road',
  'wayward-cave': 'wayward-cave',
  'route-207': 'route-207',
  'route-208': 'route-208',
  'hearthome-city': 'hearthome-city',
  'route-209': 'route-209',
  'lost-tower': 'lost-tower',
  'solaceon-town': 'solaceon-town',
  'solaceon-ruins': 'solaceon-ruins',
  'route-210-south': 'route-210',
  'route-210-north': 'northern-route-210',
  'route-215': 'route-215',
  'veilstone-city': 'veilstone-city',
  'route-214': 'route-214',
  'valor-lakefront': 'valor-lakefront',
  'route-213': 'route-213',
  'pastoria-city': 'pastoria-city',
  'great-marsh': 'great-marsh',
  'celestic-town': 'celestic-town',
  'route-218': 'route-218',
  'canalave-city': 'canalave-city',
  'lake-valor': 'lake-valor',
  'mt-coronet-south': 'mount-coronet',
  'mt-coronet-east': 'mount-coronet',
  'mt-coronet-north': 'mount-coronet',
  'route-216': 'route-216',
  'route-217': 'route-217',
  'snowpoint-city': 'snowpoint-city',
  'lake-acuity': 'lake-acuity',
  'spear-pillar': 'mount-coronet-summit',
  'route-222': 'route-222',
  'sunyshore-city': 'sunyshore-city',
  'route-223': 'route-223',
  'victory-road': 'victory-road',
  'pokemon-league': 'elite-four-champion',
  'ramanas-park': 'ramanas-park',
};

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

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&eacute;/g, 'e')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function stripHtml(html) {
  return normalizeWhitespace(
    decodeEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' '),
    ),
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getLevelPatterns(level) {
  return [
    new RegExp(`level\\s*${level}\\b`, 'i'),
    new RegExp(`lv\\.?\\s*${level}\\b`, 'i'),
  ];
}

function scoreTrainerCandidate(context, trainer) {
  let score = 0;

  trainer.pokemon.forEach(pokemon => {
    const speciesPattern = new RegExp(`\\b${escapeRegExp(pokemon.species)}\\b`, 'i');
    if (speciesPattern.test(context)) score += 5;

    if (getLevelPatterns(pokemon.level).some(pattern => pattern.test(context))) score += 2;
  });

  return score;
}

function findTrainerIdsForText(text, trainersByName) {
  const occurrences = [];
  const uniqueNames = [...trainersByName.keys()].sort((left, right) => right.length - left.length);

  uniqueNames.forEach(name => {
    const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'g');
    let match = pattern.exec(text);

    while (match) {
      occurrences.push({ name, index: match.index });
      match = pattern.exec(text);
    }
  });

  occurrences.sort((left, right) => left.index - right.index);

  const selectedTrainerIds = [];
  const usedTrainerIds = new Set();

  occurrences.forEach(({ name, index }) => {
    const context = text.slice(index, index + 400);
    const candidates = (trainersByName.get(name) || []).filter(trainer => !usedTrainerIds.has(trainer.id));

    if (candidates.length === 0) return;

    const scoredCandidates = candidates
      .map(trainer => ({
        trainer,
        score: scoreTrainerCandidate(context, trainer),
      }))
      .sort((left, right) => {
        if (left.score !== right.score) return right.score - left.score;
        return left.trainer.trainerId - right.trainer.trainerId;
      });

    const [bestMatch] = scoredCandidates;
    if (!bestMatch || bestMatch.score < 5) return;

    usedTrainerIds.add(bestMatch.trainer.id);
    selectedTrainerIds.push(bestMatch.trainer.id);
  });

  return selectedTrainerIds;
}

async function main() {
  const trainerIndex = JSON.parse(fs.readFileSync(TRAINER_INDEX_PATH, 'utf8'));
  const areaIndex = JSON.parse(fs.readFileSync(AREA_INDEX_PATH, 'utf8'));
  const trainers = trainerIndex.map(entry => JSON.parse(
    fs.readFileSync(path.join(TRAINERS_DIR, path.basename(entry.file)), 'utf8'),
  ));
  const trainersByName = new Map();

  trainers.forEach(trainer => {
    const existing = trainersByName.get(trainer.name) || [];
    existing.push(trainer);
    trainersByName.set(trainer.name, existing);
  });

  for (const areaEntry of areaIndex) {
    const pageSlug = PAGE_SLUG_BY_AREA_ID[areaEntry.id];
    const areaPath = path.join(AREAS_DIR, path.basename(areaEntry.file));
    const areaData = JSON.parse(fs.readFileSync(areaPath, 'utf8'));

    if (!pageSlug) {
      fs.writeFileSync(areaPath, `${JSON.stringify(areaData, null, 2)}\n`);
      continue;
    }

    const url = `https://www.thonky.com/pokemon-brilliant-diamond-shining-pearl/${pageSlug}`;
    const text = stripHtml(await fetchText(url));
    const trainerIds = findTrainerIdsForText(text, trainersByName);

    areaData.trainerIds = [...new Set(trainerIds)];
    fs.writeFileSync(areaPath, `${JSON.stringify(areaData, null, 2)}\n`);
    console.log(`${areaEntry.id}: ${areaData.trainerIds.length} trainers`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
