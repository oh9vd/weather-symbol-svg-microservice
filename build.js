const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs/promises"); // Native Node.js fs.promises
const fse = require("fs-extra"); // fs-extra for directory copying
const archiver = require("archiver"); // For creating zip archives

// Define source and destination paths
const entryPoint = path.resolve(__dirname, "src", "server.js");
const outputDir = path.resolve(__dirname, "dist");
const outputFile = path.join(outputDir, "bundle.js");
const assetsSourceDir = path.resolve(__dirname, "assets");
const assetsDestDir = path.join(outputDir, "assets"); // Destination for assets in dist
const zipFileName = "weather-symbol-microservice.zip"; // Name of the zip file to create
const zipFilePath = path.join(outputDir, zipFileName); // Full path to the zip file
const packageJsonSource = path.resolve(__dirname, "package.json");
const packageJsonDest = path.resolve(outputDir, "package.json");

// Get app version
const packageJson = JSON.parse(fse.readFileSync(packageJsonSource, 'utf8'));
const APP_VERSION = packageJson.version; 

// Get git commit hash
const { execSync } = require('child_process');
let GIT_COMMIT_HASH;
try {
  GIT_COMMIT_HASH = execSync('git rev-parse HEAD').toString().trim();
  console.log(`Building version ${APP_VERSION} (Git Commit: ${GIT_COMMIT_HASH})`);
} catch (e) {
  console.warn("Git not found or commit hash could not be determined.");
  GIT_COMMIT_HASH = 'unknown';
}

const buildOptions = {
  entryPoints: ['src/server.js'],
  bundle: true,
  outfile: 'dist/bundle.js',
  platform: 'node',
  target: 'node22', // Or your target Node.js version
  // Define GLOBAL environment variables that esbuild will replace in the bundled code
  define: {
    'process.env.APP_VERSION': JSON.stringify(APP_VERSION),
    'process.env.GIT_COMMIT_HASH': JSON.stringify(GIT_COMMIT_HASH),
  }
};


async function buildProject() {
  // Varmista, että output-hakemisto on olemassa
  await fs.mkdir(outputDir, { recursive: true });

  try {
    // Step 1: Bundle JavaScript ---
    console.log("Bundling JavaScript...");
    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: "node",
      outfile: outputFile,
      minify: true,
      sourcemap: false,
      logLevel: "info",
      external: ["express", "svgo", "cors"],
    });
    console.log(`✅ JavaScript bundle created: ${outputFile}`);

    // Step 2: Copy Assets directory ---
    console.log(
      `Copying assets from ${assetsSourceDir} to ${assetsDestDir}...`
    );
    await fse.copy(assetsSourceDir, assetsDestDir, { overwrite: true });
    console.log(`✅ Assets copied to: ${assetsDestDir}`);

    console.log("Copying package.json...");
    await fse.copy(packageJsonSource, packageJsonDest, { overwrite: true });
    console.log(`✅ package.json copied to: ${packageJsonDest}`);

    // Step 3: Package dist directory as a zip file ---
    console.log(`Creating zip archive: ${zipFilePath}...`);
    await createZipArchive(outputDir, zipFilePath);
    console.log(`✅ Distribution package created: ${zipFilePath} `);

    console.log(
      `\n🚀 ${new Date().toUTCString()}: Build process completed successfully!`
    );

    console.log(
      "\n😄 Remember to run 'npm install --production' in destination environment."
    );
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

/**
 * Creates a zip archive from the given source directory.
 * @param {string} sourceDir - Directory to be zipped.
 * @param {string} outPath - Path and name of the zip file to create.
 * @returns {Promise<void>}
 */
function createZipArchive(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    const output = fse.createWriteStream(outPath);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Paras pakkaustaso
    });

    output.on("close", () => {
      console.log(`  Archiver finished. Total bytes: ${archive.pointer()}`);
      resolve();
    });

    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        console.warn("Archiver warning:", err.message);
      } else {
        reject(err);
      }
    });

    archive.on("error", (err) => {
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
