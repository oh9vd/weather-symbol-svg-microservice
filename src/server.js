// server.js
const express = require("express");
const path = require("path");
const weatherSymbolService = require("./services/weatherSymbolService");
const { yn } = require("./utils/yn");

const app = express();

const port = process.env.PORT || 4000;
const noOptSvg = yn(process.env.NOOPTSVG || "");

const ASSETS_ROOT = process.env.ASSETS_BASE_PATH
  ? path.resolve(process.env.ASSETS_BASE_PATH)
  : path.resolve(__dirname, "..");

const APP_VERSION = process.env.APP_VERSION || 'unknown';
const GIT_COMMIT_HASH = process.env.GIT_COMMIT_HASH || 'unknown'; 

const ASSETS_DIR = path.join(ASSETS_ROOT, "assets");
const ELEMENTS_DIR = path.join(ASSETS_DIR, "elements");

// Define asset directories for services
app.set("svgAssetsDir", ASSETS_DIR);
app.set("svgElementsDir", ELEMENTS_DIR);

// -- Routes --

// Route for wind arrow SVGs
app.get('/wind_direction/:angle', async (req, res) => {
    try {
        const { angle } = req.params;
        const { viewBox, width, height } = req.query;
        const svg = await weatherSymbolService.getWindArrowSvg(
            parseInt(angle, 10),
            { viewBox, width, height },
            app.get('svgAssetsDir'), // Pass asset directory to the service
            noOptSvg
        );
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svg);
    } catch (error) {
        console.error('Error in wind direction SVG endpoint:', error);
        // Use error.statusCode if set by the service, otherwise default to 500
        res.status(error.statusCode || 500).send(error.message || 'Server error');
    }
});

// Route for weather symbols based on vaisala weather codes
app.get("/weather_symbol/:weather_code", async (req, res) => {
  try {
    const { weather_code } = req.params;
    const { viewBox, width, height } = req.query;

    const svg = await weatherSymbolService.getVaisalaSymbolSvg(
      weather_code,
      { viewBox, width, height },
      app.get("svgElementsDir"), // Pass elements directory to the service
      noOptSvg
    );
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  } catch (error) {
    console.error("Error in Vaisala symbol endpoint:", error);
    res.status(error.statusCode || 500).send(error.message || "Server error");
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    ts: new Date().toISOString(),
    appName: "Weather Symbol Microservice",
    version: APP_VERSION,
    commitHash: GIT_COMMIT_HASH, 
    buildDate: new Date().toISOString(), 
    nodeEnv: process.env.NODE_ENV 
  });
});

// Start the server
app.listen(port, () => {
  console.log(`${new Date().toISOString()}: Weather Symbol Microservice is running on port ${port}!`);
  console.log(`Application Version: ${APP_VERSION}`);
  console.log(`Git Commit: ${GIT_COMMIT_HASH}`); 
});
