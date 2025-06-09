const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs/promises"); // Native Node.js fs.promises
const fsSync = require("fs"); // for synchronous file access
const fse = require("fs-extra"); // fs-extra for directory copying
const { execSync } = require('child_process'); // For executing shell commands (like git)

// Define source and destination paths
const entryPoint = path.resolve(__dirname, "src", "server.js");
const outputDir = path.resolve(__dirname, "dist");
const outputFile = path.join(outputDir, "bundle.js");
const assetsSourceDir = path.resolve(__dirname, "assets");
const assetsDestDir = path.join(outputDir, "assets"); // Destination for assets in dist
const packageJsonSource = path.resolve(__dirname, "package.json");
const packageJsonDest = path.resolve(outputDir, "package.json");

// --- Get the version number ---
let APP_VERSION = 'unknown';
let GIT_COMMIT_HASH = 'unknown';

try {
  const packageJsonPath = path.resolve(__dirname, 'package.json');
  const packageJson = JSON.parse(fsSync.readFileSync(packageJsonSource, 'utf8')); 
  APP_VERSION = packageJson.version || 'unknown';
} catch (e) {
  console.warn("⚠️ Warning: Could not read package.json for version. Using 'unknown'.", e.message);
}

try {
  // Try to fetch git commit hash, git is required in build environment
  GIT_COMMIT_HASH = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  console.warn("⚠️ Warning: Git commit hash could not be determined (is Git installed and is this a Git repo?). Using 'unknown'.", e.message);
}

console.log(`Building application version: ${APP_VERSION}`);
console.log(`Building from Git commit: ${GIT_COMMIT_HASH}`);
// --- End of version number fetch ---

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
      // --- UUSI LOHKO: Define -määritykset ---
      define: {
        'process.env.APP_VERSION': JSON.stringify(APP_VERSION),
        'process.env.GIT_COMMIT_HASH': JSON.stringify(GIT_COMMIT_HASH),
      },
      // --- LOHKON LOPPU ---
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

// Call the build function
buildProject();