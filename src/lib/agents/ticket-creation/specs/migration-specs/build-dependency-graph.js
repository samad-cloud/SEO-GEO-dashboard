const fs = require('fs');
const path = require('path');

const SPECS_DIR = __dirname;
const INDEX_PATH = path.join(SPECS_DIR, 'index.yaml');

// Helper to normalize paths
function normalizePath(sourcePath) {
  if (!sourcePath) return null;

  // Remove src/ prefix
  let normalized = sourcePath.replace(/^src[\/\\]/, '');

  // Normalize backslashes to forward slashes
  normalized = normalized.replace(/\\/g, '/');

  // Remove file extension
  normalized = normalized.replace(/\.(ts|tsx|js|jsx)$/, '');

  return normalized;
}

// Helper to resolve dependency path relative to source file
function resolveDependencyPath(sourceFile, depPath) {
  if (!sourceFile || !depPath) return null;

  // Handle absolute paths with ~/ (alias for src/)
  if (depPath.startsWith('~/')) {
    return normalizePath(depPath.replace('~/', ''));
  }

  // Handle relative paths
  if (depPath.startsWith('./') || depPath.startsWith('../')) {
    const sourceDir = path.dirname(sourceFile);
    const resolved = path.join(sourceDir, depPath);
    return normalizePath(resolved).replace(/\\/g, '/');
  }

  // Already normalized
  return normalizePath(depPath);
}

// Recursively find all .yaml files
function findYamlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findYamlFiles(filePath, fileList);
    } else if (file.endsWith('.yaml') && file !== 'index.yaml' && file !== 'discovery.yaml' && file !== 'build-dependency-graph.js') {
      const relativePath = path.relative(SPECS_DIR, filePath).replace(/\\/g, '/');
      fileList.push(relativePath);
    }
  });

  return fileList;
}

// Parse spec file to get source_file
function getSourceFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed === '') continue;

    // Look for source_file at root level
    if (line.match(/^source_file:/)) {
      return line.split(':').slice(1).join(':').trim();
    }

    // Look for source: followed by a path string directly
    if (line.match(/^source: /)) {
      const value = line.split(':').slice(1).join(':').trim();
      // If it's not empty and doesn't look like the start of a nested object, it's the path
      if (value && value !== '' && !value.startsWith('{')) {
        return value;
      }
    }

    // Look for source: then file: or path: on next lines (with proper indentation)
    if (line.match(/^source:\s*$/)) {
      // Check next few lines for file: or path: with 2-space indent
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j];
        // Match file: or path: with at least 2 spaces indent
        if (nextLine.match(/^\s+(file|path):/)) {
          return nextLine.split(':').slice(1).join(':').trim();
        }
        // Stop if we hit another root-level key
        if (nextLine.match(/^\w+:/)) {
          break;
        }
      }
    }
  }

  return null;
}

// Parse dependencies from index.yaml
function parseDependencies(indexContent) {
  const lines = indexContent.split('\n');
  const deps = new Map();
  let currentUnit = null;
  let currentSpec = null;
  let inDependencies = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match unit key (entries under units:)
    if (line.match(/^  [\w.-]+:/)) {
      const match = line.match(/^  ([\w.-]+):/);
      currentUnit = match ? match[1] : null;
      inDependencies = false;
      currentSpec = null;
      continue;
    }

    // Match spec path
    if (currentUnit && line.match(/^    spec:/)) {
      currentSpec = trimmed.split(':')[1].trim();
      continue;
    }

    // Match dependencies section
    if (currentUnit && line.match(/^    dependencies:/)) {
      inDependencies = true;
      if (currentSpec) {
        deps.set(currentSpec, []);
      }
      continue;
    }

    // Match dependency items
    if (inDependencies && trimmed.startsWith('- ')) {
      const dep = trimmed.substring(2).trim().replace(/^["']|["']$/g, '');
      if (currentSpec && deps.has(currentSpec)) {
        deps.get(currentSpec).push(dep);
      }
      continue;
    }

    // Exit dependencies section
    if (inDependencies && line.match(/^    [a-z_]+:/)) {
      inDependencies = false;
    }
  }

  return deps;
}

// Read all spec files
console.log('Finding all spec files...');
const specFiles = findYamlFiles(SPECS_DIR);

console.log(`Found ${specFiles.length} spec files`);

// Build source -> spec mapping
const sourceToSpec = new Map();

console.log('Building source->spec mapping...');
let foundSourceFiles = 0;
let missingSourceFiles = [];

specFiles.forEach(specPath => {
  const fullPath = path.join(SPECS_DIR, specPath);
  const sourceFile = getSourceFile(fullPath);

  if (sourceFile) {
    foundSourceFiles++;
    const normalized = normalizePath(sourceFile);
    if (normalized) {
      sourceToSpec.set(normalized, specPath);

      // Also add without /index for directory imports
      if (normalized.endsWith('/index')) {
        sourceToSpec.set(normalized.replace('/index', ''), specPath);
      }
    }
  } else {
    if (missingSourceFiles.length < 10) {
      missingSourceFiles.push(specPath);
    }
  }
});

console.log(`Found source files in ${foundSourceFiles} specs`);
if (missingSourceFiles.length > 0) {
  console.log(`Missing source files in: ${missingSourceFiles.join(', ')}`);
}
console.log(`Built source->spec mapping with ${sourceToSpec.size} entries`);

// Debug: show some mappings
console.log('Sample mappings:');
let count = 0;
for (const [source, spec] of sourceToSpec.entries()) {
  if (count++ < 5) {
    console.log(`  ${source} -> ${spec}`);
  }
}

// Read index.yaml
console.log('\nReading index.yaml for dependencies...');
const indexContent = fs.readFileSync(INDEX_PATH, 'utf8');

// Parse dependencies
const specDeps = parseDependencies(indexContent);

console.log(`Extracted dependencies for ${specDeps.size} specs from index`);

// Build resolved dependencies
const resolvedDeps = new Map();
const unresolvedDeps = [];

specDeps.forEach((deps, specPath) => {
  if (!deps || !Array.isArray(deps)) {
    resolvedDeps.set(specPath, []);
    return;
  }

  const fullPath = path.join(SPECS_DIR, specPath);
  const sourceFile = getSourceFile(fullPath);
  const normalizedSource = normalizePath(sourceFile);

  const resolved = [];

  deps.forEach(dep => {
    const resolvedPath = resolveDependencyPath(normalizedSource, dep);

    if (resolvedPath) {
      let targetSpec = sourceToSpec.get(resolvedPath);

      if (targetSpec) {
        resolved.push({
          path: dep,
          spec: targetSpec
        });
      } else {
        unresolvedDeps.push({
          spec: specPath,
          dependency: dep,
          resolvedPath
        });
      }
    }
  });

  resolvedDeps.set(specPath, resolved);
});

console.log(`Resolved dependencies for ${resolvedDeps.size} specs`);
console.log(`Unresolved dependencies: ${unresolvedDeps.length}`);

// Calculate dependency levels
const levels = new Map();
const visited = new Set();
const inProgress = new Set();

function calculateLevel(specPath) {
  if (visited.has(specPath)) {
    return levels.get(specPath) || 0;
  }

  // Detect circular dependencies
  if (inProgress.has(specPath)) {
    console.warn(`Circular dependency detected: ${specPath}`);
    levels.set(specPath, 0);
    return 0;
  }

  inProgress.add(specPath);

  const deps = resolvedDeps.get(specPath) || [];

  if (deps.length === 0) {
    // Leaf node
    levels.set(specPath, 0);
    visited.add(specPath);
    inProgress.delete(specPath);
    return 0;
  }

  // Calculate level based on max dependency level + 1
  const maxDepLevel = Math.max(
    0,
    ...deps.map(d => calculateLevel(d.spec))
  );

  const level = maxDepLevel + 1;
  levels.set(specPath, level);
  visited.add(specPath);
  inProgress.delete(specPath);
  return level;
}

// Calculate levels for all specs
specFiles.forEach(specPath => {
  if (!levels.has(specPath)) {
    calculateLevel(specPath);
  }
});

console.log(`\nCalculated levels for ${levels.size} specs`);

// Group by level
const levelGroups = new Map();
const maxLevel = Math.max(0, ...Array.from(levels.values()));

for (let i = 0; i <= maxLevel; i++) {
  levelGroups.set(i, []);
}

levels.forEach((level, specPath) => {
  levelGroups.get(level).push(specPath);
});

// Identify pages (routes)
const pages = specFiles.filter(s => s.startsWith('frontend/routes/'));

// Build dependency graph YAML
let graphYaml = '\ndependency_graph:\n';
graphYaml += '  leaf_nodes:\n';
const leafNodes = levelGroups.get(0);
if (leafNodes && leafNodes.length > 0) {
  leafNodes.forEach(spec => {
    graphYaml += `    - ${spec}\n`;
  });
} else {
  graphYaml += '    []\n';
}

graphYaml += '\n  levels:\n';
for (let i = 1; i <= maxLevel; i++) {
  const specs = levelGroups.get(i);
  if (specs && specs.length > 0) {
    graphYaml += `    level_${i}:\n`;
    specs.forEach(spec => {
      graphYaml += `      - ${spec}\n`;
    });
  }
}

graphYaml += '\n  pages:\n';
if (pages.length > 0) {
  pages.forEach(page => {
    graphYaml += `    - ${page}\n`;
  });
} else {
  graphYaml += '    []\n';
}

graphYaml += '\n  statistics:\n';
graphYaml += `    total_specs: ${specFiles.length}\n`;
graphYaml += `    leaf_nodes_count: ${leafNodes ? leafNodes.length : 0}\n`;
graphYaml += `    max_depth: ${maxLevel}\n`;
graphYaml += `    unresolved_dependencies: ${unresolvedDeps.length}\n`;

// Append to index.yaml
console.log('\nAppending dependency graph to index.yaml...');
fs.appendFileSync(INDEX_PATH, graphYaml, 'utf8');

console.log('Dependency graph added to index.yaml');

// Write unresolved dependencies report
if (unresolvedDeps.length > 0) {
  console.log('\nUnresolved dependencies (first 20):');
  unresolvedDeps.slice(0, 20).forEach(({ spec, dependency, resolvedPath }) => {
    console.log(`  ${spec}`);
    console.log(`    ${dependency} -> ${resolvedPath}`);
  });

  if (unresolvedDeps.length > 20) {
    console.log(`  ... and ${unresolvedDeps.length - 20} more`);
  }
}

console.log('\n=== SUMMARY ===');
console.log(`Total specs: ${specFiles.length}`);
console.log(`Leaf nodes: ${leafNodes ? leafNodes.length : 0}`);
console.log(`Max depth: ${maxLevel}`);
console.log(`Unresolved deps: ${unresolvedDeps.length}`);
console.log(`\nLevel distribution:`);
for (let i = 0; i <= maxLevel; i++) {
  const count = levelGroups.get(i).length;
  console.log(`  Level ${i}: ${count} specs`);
}
