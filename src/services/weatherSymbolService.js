// services/weatherSymbolService.js
const fs = require("fs").promises;
const path = require("path");
const { optimize } = require("svgo");
const { extractSvgContentAndDefs } = require("../utils/svgExtractor");
const { isValidWeatherCode, isValidAngle } = require("../utils/validator");

// --- Helper functions for Vaisala code parsing ---

/**
 * Adds celestial body (sun/moon) components based on day/night and cloudiness.
 * @param {Array} components - The array to add components to.
 * @param {string} dayNight - 'd' for day, 'n' for night.
 * @param {number} cloudiness - Cloudiness level (0-6).
 */
function addCelestialBody(components, dayNight, cloudiness) {
  // Avoid displaying sun/moon if it's very cloudy or foggy (levels 4 or 6)
  if (![4, 6].includes(cloudiness)) {
    const celestialBody = dayNight === "d" ? "sun" : "moon";
    components.push({ name: celestialBody, x: 0, y: 0, scale: 1 });
  }
}

/**
 * Adds cloudiness component based on the cloudiness level.
 * @param {Array} components - The array to add components to.
 * @param {number} cloudiness - Cloudiness level (0-6).
 */
function addCloudiness(components, cloudiness) {
  // Ensure these files (cloud-1.svg, cloud-3.svg, cloud-5.svg, cloud-6.svg) exist in the assets directory
  const cloudConfigurations = {
    1: { name: "cloud-1", x: 20, y: 0, scale: 0.7 }, // Partly clear with some clouds
    2: { name: "cloud-1", x: 5, y: 5, scale: 1 }, // Partly cloudy
    3: { name: "cloud-3", x: 0, y: 0, scale: 1.2 }, // Broken clouds
    4: { name: "cloud-3", x: 0, y: 0, scale: 1.5 }, // Overcast
    5: { name: "cloud-5", x: 0, y: 0, scale: 1 }, // Thin high clouds
    6: { name: "cloud-6", x: 0, y: 0, scale: 1 }, // Fog
  };

  if (cloudConfigurations[cloudiness]) {
    components.push(cloudConfigurations[cloudiness]);
  }
}

/**
 * Adds precipitation component based on rate and type.
 * @param {Array} components - The array to add components to.
 * @param {number} rate - Precipitation rate (0: none, 1: light, 2: showers, 3: continuous, 4: thunderstorm).
 * @param {number} type - Precipitation type (0: rain, 1: sleet, 2: snow).
 */
function addPrecipitation(components, rate, type) {
  if (rate <= 0 || rate > 4 || type < 0 || type > 2) return;

  const elemScales = [1, 0.9, 0.8];

  if (rate === 4) {
    components.push({ name: "thunderbolt", x: 30, y: 30, scale: 1 });
    rate = 2; // Adjust rate for subsequent precipitation
  }

  const elemScale = elemScales[rate - 1];

  const precipitationTypes = [
    { name: "rain", xOffset: 10, yOffset: -1 },
    { name: "snow", xOffset: 15, yOffset: 1 },
  ];

  precipitationTypes.forEach((precipitation, index) => {
    if (type === 1 || type === index) {
      for (let i = 0; i < rate; i++) {
        components.push({
          name: precipitation.name,
          x: i * precipitation.xOffset,
          y: 20 + i * precipitation.yOffset,
          scale: elemScale,
        });
      }
    }
  });
}

/**
 * Parses a Vaisala weather code and returns a list of SVG components to be combined.
 * @param {string} weatherCode - The 4-character Vaisala weather code (e.g., 'd220').
 * @returns {Array} An array of component objects (each with name, x, y, scale).
 * @throws {Error} If the weather code format is invalid.
 */
function parseVaisalaWeatherCode(weatherCode) {
  if (!isValidWeatherCode(weatherCode)) {
    const error = new Error("Invalid Vaisala weather code format.");
    error.statusCode = 400; // Indicate a bad request
    throw error;
  }

  const [
    dayNight,
    cloudinessChar,
    precipitationRateChar,
    precipitationTypeChar,
  ] = weatherCode;
  
  const cloudiness = parseInt(cloudinessChar, 10);
  const precipitationRate = parseInt(precipitationRateChar, 10);
  const precipitationType = parseInt(precipitationTypeChar, 10);

  const components = [];

  addCelestialBody(components, dayNight, cloudiness);
  addCloudiness(components, cloudiness);
  addPrecipitation(components, precipitationRate, precipitationType);

  return components;
}

// --- Service Functions ---

/**
 * Fetches and generates an SVG for wind direction, rotated to the specified angle.
 * @param {number} angleDegrees - The wind direction in degrees (0-359).
 * @param {string} svgAssetsDir - The path to the SVG assets directory.
 * @param {boolean} noOptSvg - If set to true does not optimize the output svg, defaults to false.*
 * @returns {Promise<string>} A promise that resolves to the optimized SVG string.
 * @throws {Error} If the angle is invalid or SVG processing fails.
 */
async function getWindArrowSvg(angleDegrees, svgAssetsDir, noOptSvg = false) {
  if (!isValidAngle(angleDegrees)) {
    const error = new Error("Invalid angle parameter for wind direction SVG.");
    error.statusCode = 400;
    throw error;
  }

  const symbolName = "wind-arrow";
  const svgPath = path.join(svgAssetsDir, `${symbolName}.svg`);

  try {
    // Reads the base wind arrow SVG. Assumes it's a 24x24 SVG
    // with the arrow centered around (12,12) in its own coordinate system.
    const baseWindArrowSvgRaw = await fs.readFile(svgPath, "utf8");
    const parsedBaseSvg = extractSvgContentAndDefs(baseWindArrowSvgRaw);

    if (!parsedBaseSvg) {
      const error = new Error(
        `Error parsing ${symbolName}.svg: Invalid SVG structure.`
      );
      error.statusCode = 500;
      throw error;
    }

    // To center the 24x24 arrow within a 64x64 viewBox,
    // we need to translate it by (32-12, 32-12) = (20,20).
    // The rotation is then applied around its original center (12,12),
    // which effectively rotates it around (32,32) within the 64x64 viewBox.
    const translateX = 32 - 12;
    const translateY = 32 - 12;

    const finalSvg = `
            <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <style type="text/css">${parsedBaseSvg.style}</style>
                    ${parsedBaseSvg.defs}
                </defs>
                <g transform="translate(${translateX} ${translateY})">
                    <g transform="rotate(${angleDegrees} 12 12)">
                        ${parsedBaseSvg.mainContent}
                    </g>
                </g>
            </svg>
        `;

    if (noOptSvg) return finalSvg;

    const optimizedSvg = optimize(finalSvg, { multipass: true });
    return optimizedSvg.data;
  } catch (err) {
    console.error(`Error loading or processing wind arrow symbol:`, err);
    const error = new Error("Failed to generate wind direction SVG.");
    error.statusCode = 500;
    throw error;
  }
}

/**
 * Fetches and combines SVG components for a given Vaisala weather code.
 * @param {string} weatherCode - The Vaisala weather code.
 * @param {object} svgParams - SVG parameters (viewBox, width, height).
 * @param {string} svgElementsDir - The path to the directory containing individual SVG element files.
 * @param {boolean} noOptSvg - If set to true does not optimize the output svg, defaults to false.*
 * @returns {Promise<string>} A promise that resolves to the optimized combined SVG string.
 * @throws {Error} If the weather code is invalid or SVG combination fails.
 */
async function getVaisalaSymbolSvg(
  weatherCode,
  svgParams,
  svgElementsDir,
  noOptSvg = false
) {
  const { viewBox = "0 0 64 64", width = "64", height = "64" } = svgParams;

  const elementsToCombine = parseVaisalaWeatherCode(weatherCode);

  // If parseVaisalaWeatherCode throws, this check won't be reached.
  // This check is mainly for cases where the parsing function might return an empty array
  // without throwing for specific unprocessable codes (though it's designed to throw now).
  if (elementsToCombine.length === 0) {
    const error = new Error(
      "Invalid or unprocessable Vaisala weather code resulted in no components."
    );
    error.statusCode = 400;
    throw error;
  }

  try {
    const elementPromises = elementsToCombine.map(async (comp) => {
      const svgPath = path.join(svgElementsDir, `${comp.name}.svg`);
      try {
        return await fs.readFile(svgPath, "utf8");
      } catch (err) {
        // Log a warning if an element file is not found but allow the process to continue.
        console.warn(
          `Warning: SVG element '${comp.name}.svg' not found at ${svgPath}. It will be skipped.`
        );
        return null; // Return null if the file is not found
      }
    });

    const rawSvgContents = await Promise.all(elementPromises);
    let combinedSvgContent = "";
    let combinedStyles = "";
    // Using a Set to ensure unique <defs> content when combining multiple SVGs
    let combinedDefs = new Set();

    rawSvgContents.forEach((svgRaw, i) => {
      if (!svgRaw) return; // Skip null values (for missing files)

      const comp = elementsToCombine[i];
      const parsed = extractSvgContentAndDefs(svgRaw);

      if (parsed) {
        // Accumulate styles, ensuring each style block is on a new line
        combinedStyles += `${parsed.style}\n`;
        // Add defs content to the Set to ensure uniqueness
        if (parsed.defs) {
          combinedDefs.add(parsed.defs);
        }

        // Compose transformation string based on component properties
        const transform =
          `translate(${comp.x || 0} ${comp.y || 0}) scale(${comp.scale || 1})` +
          (comp.rotation
            ? ` rotate(${comp.rotation.angle} ${comp.rotation.cx} ${comp.rotation.cy})`
            : "");

        // Add the transformed SVG content (main part of the component) to the aggregation
        combinedSvgContent += `<g transform="${transform}">${parsed.mainContent}</g>`;
      }
    });

    // Construct the final SVG by combining all extracted parts
    const finalSvg = `
            <svg width="${width}" height="${height}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <style type="text/css">
                        ${combinedStyles}
                    </style>
                    ${Array.from(combinedDefs).join("")}
                </defs>
                ${combinedSvgContent}
            </svg>
        `;

    if (noOptSvg) return finalSvg;

    // Optimize the combined SVG for better performance and smaller file size
    const optimizedSvg = optimize(finalSvg, { multipass: true });
    return optimizedSvg.data;
  } catch (err) {
    console.error("Error in getVaisalaSymbolSvg:", err);
    const error = new Error("Failed to generate Vaisala symbol SVG.");
    error.statusCode = 500;
    throw error;
  }
}

module.exports = {
  getWindArrowSvg,
  getVaisalaSymbolSvg,
};
