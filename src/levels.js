export default function findAllLevels(features) {
  const levels = [];
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    if (feature.properties.class === 'level') {
      continue;
    }
    const level = feature.properties.level;
    if (!levels.includes(level)) {
      levels.push(level);
    }
  }
  return levels.sort((a, b) => a - b).reverse();
}
