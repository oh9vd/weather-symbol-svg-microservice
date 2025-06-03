const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs/promises'); // Native Node.js fs.promises
const fse = require('fs-extra');   // fs-extra for directory copying
const archiver = require('archiver'); // For creating zip archives

// Määritä lähde- ja kohdepolut
const entryPoint = path.resolve(__dirname, 'src', 'server.js');
const outputDir = path.resolve(__dirname, 'dist');
const outputFile = path.join(outputDir, 'bundle.js');
const assetsSourceDir = path.resolve(__dirname, 'assets');
const assetsDestDir = path.join(outputDir, 'assets'); // Assetsien kohde dist-kansiossa
const zipFileName = 'weather-symbol-microservice.zip'; // Luotavan zip-tiedoston nimi
const zipFilePath = path.join(outputDir, zipFileName); // Zip-tiedoston koko polku
const packageJsonSource = path.resolve(__dirname, 'package.json'); 
const pckageJsonDest = path.resolve(outputDir, 'package.json');

async function buildProject() {
    // Varmista, että output-hakemisto on olemassa
    await fs.mkdir(outputDir, { recursive: true });

    try {
        // --- Vaihe 1: Bundlaa JavaScript ---
        console.log('Bundling JavaScript...');
        await esbuild.build({
            entryPoints: [entryPoint],
            bundle: true,
            platform: 'node',
            outfile: outputFile,
            minify: true,
            sourcemap: false,
            logLevel: 'info',
            external: [
                'express',
                'svgo',
                'cors'
            ],
        });
        console.log(`✅ JavaScript bundle created: ${outputFile}`);

        // --- Vaihe 2: Kopioi Assets-hakemisto ---
        console.log(`Copying assets from ${assetsSourceDir} to ${assetsDestDir}...`);
        await fse.copy(assetsSourceDir, assetsDestDir, { overwrite: true });
        console.log(`✅ Assets copied to: ${assetsDestDir}`);

        console.log('Copying package.json...'); 
        await fse.copy(packageJsonSource, pckageJsonDest, { overwrite: true }); 
        console.log(`✅ package.json copied to: ${pckageJsonDest}`);        

        // --- Vaihe 3: Pakkaa dist-hakemisto zip-tiedostoksi ---
        console.log(`Creating zip archive: ${zipFilePath}...`);
        await createZipArchive(outputDir, zipFilePath);
        console.log(`✅ Distribution package created: ${zipFilePath} `);
        
        console.log(`\n🚀 ${new Date().toUTCString()}: Build process completed successfully!`);

        console.log("\n😄 Remember to run 'npm install --production' in destination environment.")

    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

/**
 * Luo zip-arkiston annetusta lähdehakemistosta.
 * @param {string} sourceDir - Hakemisto, joka pakataan.
 * @param {string} outPath - Luotavan zip-tiedoston polku ja nimi.
 * @returns {Promise<void>}
 */
function createZipArchive(sourceDir, outPath) {
    return new Promise((resolve, reject) => {
        const output = fse.createWriteStream(outPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Paras pakkaustaso
        });

        output.on('close', () => {
            console.log(`  Archiver finished. Total bytes: ${archive.pointer()}`);
            resolve();
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Archiver warning:', err.message);
            } else {
                reject(err);
            }
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);

        // Lisää kaikki tiedostot ja kansiot sourceDir:stä
        // Huomaa: sourceDir on 'dist', joten arkistoon tulee 'bundle.js', 'assets/' jne.
        archive.directory(sourceDir, false); // 'false' tarkoittaa, että se ei luo "dist/"-kansiota zip-tiedoston sisälle

        archive.finalize();
    });
}

buildProject();