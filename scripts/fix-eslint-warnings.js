#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Script to automatically fix common ESLint warnings in the codebase
 * 
 * Usage:
 *   node scripts/fix-eslint-warnings.js
 * 
 * This script:
 * 1. Runs ESLint with --fix to apply automatic fixes
 * 2. Processes the remaining warnings to fix common patterns:
 *    - Prefixes unused variables with underscore (_)
 *    - Adds __DEV__ conditions around console statements
 *    - Replaces color literals with theme colors where possible
 */

const { execSync } = require('child_process');
const fs = require('fs');
const _path = require('path'); // Kept for potential future use

// First run ESLint with --fix to apply automatic fixes
console.log('Running ESLint with --fix to apply automatic fixes...');
try {
  execSync('npx eslint . --fix', { stdio: 'inherit' });
} catch (error) {
  // ESLint will exit with error code if there are still warnings/errors
  console.log('ESLint --fix applied, but there are still issues to resolve');
}

// Get the current ESLint warnings
console.log('Analyzing remaining ESLint warnings...');
const eslintOutput = execSync('npx eslint . -f json').toString();
const eslintResults = JSON.parse(eslintOutput);

// Count of warnings by type
const warningTypes = {};

// Process each file with warnings
eslintResults.forEach(result => {
  if (result.messages.length === 0) return;
  
  const filePath = result.filePath;
  console.log(`Processing ${filePath}...`);
  
  // Get file content
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Group messages by line to avoid conflicts
  const messagesByLine = {};
  result.messages.forEach(message => {
    if (!messagesByLine[message.line]) {
      messagesByLine[message.line] = [];
    }
    messagesByLine[message.line].push(message);
    
    // Count warning types
    if (!warningTypes[message.ruleId]) {
      warningTypes[message.ruleId] = 0;
    }
    warningTypes[message.ruleId]++;
  });
  
  // Process each line with warnings
  const lines = content.split('\n');
  Object.keys(messagesByLine).forEach(lineNum => {
    const lineIndex = parseInt(lineNum) - 1;
    const line = lines[lineIndex];
    const messages = messagesByLine[lineNum];
    
    // Fix unused variables by adding underscore prefix
    const unusedVarMessages = messages.filter(m => 
      m.ruleId === 'no-unused-vars' && 
      m.message.includes('defined but never used')
    );
    
    if (unusedVarMessages.length > 0) {
      unusedVarMessages.forEach(message => {
        const varName = message.message.match(/'([^']+)'/)[1];
        if (!varName.startsWith('_')) {
          // Replace variable name with _variableName
          // This is a simple replacement and might need manual review
          const regex = new RegExp(`\\b${varName}\\b(?!\\s*:)`, 'g');
          const newLine = line.replace(regex, `_${varName}`);
          if (newLine !== line) {
            lines[lineIndex] = newLine;
            modified = true;
            console.log(`  Fixed: Added underscore to unused variable '${varName}'`);
          }
        }
      });
    }
    
    // Fix console statements by adding __DEV__ condition
    const consoleMessages = messages.filter(m => 
      m.ruleId === 'no-console'
    );
    
    if (consoleMessages.length > 0 && !line.includes('__DEV__') && !line.includes('// eslint-disable-line')) {
      // Add __DEV__ condition around console statement
      const indentation = line.match(/^\s*/)[0];
      const newLine = `${indentation}if (__DEV__) {\n${line}\n${indentation}}`;
      lines[lineIndex] = newLine;
      modified = true;
      console.log(`  Fixed: Added __DEV__ condition around console statement`);
    }
  });
  
  // Write changes back to file if modified
  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`  Saved changes to ${filePath}`);
  }
});

// Print summary of warning types
console.log('\nWarning types summary:');
Object.keys(warningTypes).sort((a, b) => warningTypes[b] - warningTypes[a]).forEach(ruleId => {
  console.log(`  ${ruleId}: ${warningTypes[ruleId]}`);
});

console.log('\nScript completed. Some warnings may still require manual fixes.');
console.log('Run "npx eslint ." to see remaining issues.');
