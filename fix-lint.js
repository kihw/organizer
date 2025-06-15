const fs = require('fs');
const path = require('path');

// Corrections automatiques
const fixes = [
    {
        file: 'src/diagnostic/ProcessDiagnostic.js',
        replacements: [
            { from: '\\"', to: '"' }, // Supprimer les escapes inutiles
        ]
    },
    {
        file: 'src/renderer/config.js',
        replacements: [
            { from: '(item, index)', to: '(item, _index)' },
        ]
    },
    {
        file: 'src/services/ShortcutConfigManager.js',
        replacements: [
            { from: 'let characterKey =', to: 'let _characterKey =' },
            { from: 'const backupConfig =', to: 'const _backupConfig =' },
        ]
    }
];

fixes.forEach(fix => {
    const filePath = path.join(__dirname, fix.file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        fix.replacements.forEach(replacement => {
            content = content.replace(new RegExp(replacement.from, 'g'), replacement.to);
        });

        fs.writeFileSync(filePath, content);
        console.log(`✓ Fixed ${fix.file}`);
    }
});

console.log('🎉 Lint fixes applied!');