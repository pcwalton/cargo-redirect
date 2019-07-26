#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const process = require('process');
const toml = require('@iarna/toml');
const walkSync = require('walk-sync');

const argv = process.argv;
if (argv.length < 5 || argv.length % 2 !== 1) {
    console.log("usage: cargo-redirect ROOT-PATH (CRATE-NAME CRATE-PATH)...");
    process.exit(1);
}

const replacements = [];
const rootPath = argv[2];
for (let i = 3; i < argv.length; i += 2)
    replacements.push([argv[i], argv[i + 1]]);

const allPaths = walkSync(rootPath);
for (const subpath of allPaths) {
    const tomlPath = path.join(rootPath, subpath);
    if (!tomlPath.endsWith("/Cargo.toml"))
        continue;
    const data = fs.readFileSync(tomlPath);
    const root = toml.parse(data);
    if (!('dependencies' in root))
        continue;
    const dependencies = root.dependencies;
    for (const replacement of replacements) {
        const crateName = replacement[0], newPath = replacement[1];
        if (!(crateName in dependencies))
            continue;
        const dependencyInfo = dependencies[crateName];
        if (typeof(dependencyInfo) === 'string')
            dependencyInfo = {};
        if ('git' in dependencyInfo)
            delete dependencyInfo.git;
        dependencyInfo.path = newPath;
        dependencies[crateName] = dependencyInfo;
    }
    const newData = toml.stringify(root);
    fs.writeFileSync(tomlPath, newData);
}
