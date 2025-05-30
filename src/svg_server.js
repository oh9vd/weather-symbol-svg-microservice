const express = require('express');
const fs = require('fs').promises;
const { optimize } = require('svgo');
const path = require('path');

const app = express();
const port = 4000;

// Define directories for SVG assets and configuration
const SVG_ASSETS_DIR = path.join(__dirname, '..', 'svg-assets');
const SYMBOLS_CONFIG_PATH = path.join(SVG_ASSETS_DIR, 'symbols-config.json');

let symbolsConfig = {};

// Load symbol configuration from a JSON file
async function loadSymbolsConfig() {
    try {
        const data = await fs.readFile(SYMBOLS_CONFIG_PATH, 'utf8');
        symbolsConfig = JSON.parse(data);
        console.log('Symbol configuration loaded successfully.');
    } catch (err) {
        console.error('ERROR: Failed to load symbol configuration:', err);
        process.exit(1);
    }
}

// Extract content and definitions from an SVG string
function extractSvgContentAndDefs(svgString) {
    const svgRegex = /<svg[^>]*>(.*?)<\/svg>/s;
    const defsRegex = /<defs>(.*?)<\/defs>/s;
    const styleRegex = /<style[^>]*>(.*?)<\/style>/s;

    const match = svgString.match(svgRegex);
    if (!match || match.length < 2) return null;

    let innerContent = match[1];

    let styleContent = '';
    const styleMatch = innerContent.match(styleRegex);
    if (styleMatch) {
        styleContent = styleMatch[1];
        innerContent = innerContent.replace(styleRegex, '');
    }

    let defsContent = '';
    const defsMatch = innerContent.match(defsRegex);
    if (defsMatch) {
        defsContent = defsMatch[1];
        innerContent = innerContent.replace(defsRegex, '');
    }

    return {
        style: styleContent,
        defs: defsContent,
        mainContent: innerContent.trim(),
    };
}

// Endpoint to generate rotated wind direction SVGs
app.get('/wind_direction_svgs', (req, res) => {
    const directionDegrees = parseInt(req.query.angle, 10);
    if (isNaN(directionDegrees) || directionDegrees < 0 || directionDegrees >= 360) {
        return res.status(400).send('Invalid or missing "angle" parameter (0-359 degrees).');
    }
    
    const BASE_WIND_ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="red" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /></svg>`;
    const transformAttr = `rotate(${directionDegrees} 12 12)`;
    const svgRegex = /<svg([^>]*)>(.*?)<\/svg>/s;
    const match = BASE_WIND_ARROW_SVG.match(svgRegex);

    if (match && match.length === 3) {
        const svgAttributes = match[1];
        const innerSvgContent = match[2];
        const finalSvgContent = `<svg${svgAttributes}><g transform="${transformAttr}">${innerSvgContent}</g></svg>`;
        
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(finalSvgContent);
    } else {
        console.error('Error parsing BASE_WIND_ARROW_SVG string.');
        res.status(500).send('Server error creating SVG image.');
    }
});

// Basic endpoint for health check
app.get('/', (req, res) => {
    res.send('Minimal Test');
});

// Endpoint to retrieve specific SVG symbols by name
app.get('/symbol/:symbol_name', async (req, res) => {
    const symbolName = req.params.symbol_name;
    const symbolConfig = symbolsConfig.elements[symbolName];

    if (!symbolConfig) {
        return res.status(404).send('SVG symbol not found with the given name.');
    }

    try {
        const svgPath = path.join(SVG_ASSETS_DIR, symbolConfig.path);
        const svgContent = await fs.readFile(svgPath, 'utf8');

        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svgContent);
    } catch (err) {
        console.error(`Error loading symbol '${symbolName}':`, err);
        res.status(500).send('Server error loading SVG symbol.');
    }
});

// Parse Vaisala weather code to determine SVG components
function parseVaisalaWeatherCode(weatherCode) {
    if (typeof weatherCode !== 'string' || weatherCode.length !== 4) {
        return []; // Return empty array if code is malformed
    }

    const dayNight = weatherCode[0]; // 'd' for daytime, 'n' for nighttime
    const cloudiness = parseInt(weatherCode[1], 10);
    const precipitationRate = parseInt(weatherCode[2], 10);
    const precipitationType = parseInt(weatherCode[3], 10);

    const components = [];

    // Add main element (sun/moon) based on day/night and cloudiness
    const mainElement = dayNight === 'd'
        ? (cloudiness <= 2 ? 'sun-base' : null)
        : (cloudiness <= 2 ? 'moon-crescent' : null);

    if (mainElement) {
        components.push({ name: mainElement, x: 0, y: 0, scale: 1 });

        // Adjust position and scale for partly cloudy conditions
        if (cloudiness === 1 || cloudiness === 2) {
            components[0].x = -15;
            components[0].y = -15;
            components[0].scale = 0.7;
        }
    }

    // Determine cloud element based on cloudiness level
    let cloudElement = null;
    let cloudX = 0;
    let cloudY = 0;
    let cloudScale = 1;

    switch (cloudiness) {
        case 0:
            break;
        case 1:
            cloudElement = 'cloud-base';
            cloudX = 10;
            cloudY = 10;
            cloudScale = 0.9;
            break;
        case 2:
            cloudElement = 'cloud-base';
            break;
        case 3:
            cloudElement = 'cloud-broken';
            break;
        case 4:
            cloudElement = 'cloud-overcast';
            cloudScale = 1.1;
            break;
        case 5:
            cloudElement = 'cloud-base';
            break;
        case 6:
            cloudElement = 'fog-symbol';
            cloudScale = 1.2;
            break;
    }

    if (cloudElement || precipitationRate > 0) {
        if (!cloudElement && precipitationRate > 0) {
            cloudElement = 'cloud-overcast';
        }
        if (cloudElement) {
             components.push({ name: cloudElement, x: cloudX, y: cloudY, scale: cloudScale });
        }
    }

    // Add precipitation element based on rate and type
    if (precipitationRate > 0) {
        let precipitationElement = '';
        let precipYOffset = 30;

        switch (precipitationType) {
            case 0: precipitationElement = 'rain-drops'; break;
            case 1: precipitationElement = 'sleet-symbol'; break;
            case 2: precipitationElement = 'snow-flakes'; break;
        }

        if (precipitationElement) {
            const precipitationConfig = [
                { x: 10, y: precipYOffset, scale: 0.7 },
                { x: 0, y: precipYOffset, scale: 1 },
                { x: 0, y: precipYOffset, scale: 1.2 },
                { x: 0, y: 15, scale: 1.2 }
            ][precipitationRate - 1] || {};

            components.push({ name: precipitationElement, ...precipitationConfig });

            if (precipitationRate === 4) { // Thunderstorm
                components.push({ name: 'thunderbolt', x: 0, y: 15, scale: 1.2 });
                components.push({ name: precipitationElement, x: 0, y: precipYOffset + 10, scale: 1.1 });
            }
        }
    }

    return components;
}

// Endpoint to combine symbols for Vaisala weather codes
app.get('/vaisala_symbol/:weather_code', async (req, res) => {
    const weatherCode = req.params.weather_code;
    const viewBox = req.query.viewBox || "0 0 64 64";
    const width = req.query.width || "64";
    const height = req.query.height || "64";

    const elementsToCombine = parseVaisalaWeatherCode(weatherCode);

    if (elementsToCombine.length === 0) {
        return res.status(400).send('Invalid or unprocessable Vaisala weather code.');
    }

    try {
        const elementPromises = elementsToCombine.map(comp => {
            const elementConfig = symbolsConfig.elements[comp.name];
            if (!elementConfig) {
                throw new Error(`SVG component '${comp.name}' not found in symbols-config.json.`);
            }
            const svgPath = path.join(SVG_ASSETS_DIR, elementConfig.path);
            return fs.readFile(svgPath, 'utf8');
        });

        const rawSvgContents = await Promise.all(elementPromises);
        let combinedSvgContent = '';
        let combinedStyles = '';
        let combinedDefs = new Set();

        rawSvgContents.forEach((svgRaw, i) => {
            const comp = elementsToCombine[i];
            const parsed = extractSvgContentAndDefs(svgRaw);

            if (parsed) {
                // Accumulate styles and defs
                combinedStyles += `${parsed.style}\n`;
                if (parsed.defs) {
                    combinedDefs.add(parsed.defs);
                }

                // Compose transformation string
                const transform = `translate(${comp.x || 0} ${comp.y || 0}) scale(${comp.scale || 1})` +
                                  (comp.rotation ? ` rotate(${comp.rotation.angle} ${comp.rotation.cx} ${comp.rotation.cy})` : '');

                // Add the transformed SVG content to the aggregation
                combinedSvgContent += `<g transform="${transform}">${parsed.mainContent}</g>`;
            }
        });

        // Create the final SVG element with combined components
        const finalSvg = `
            <svg width="${width}" height="${height}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <style type="text/css">
                        ${combinedStyles}
                    </style>
                    ${Array.from(combinedDefs).join('')}
                </defs>
                ${combinedSvgContent}
            </svg>
        `;

        // Optimize the combined SVG for better performance
        const optimizedSvg = optimize(finalSvg, { multipass: true });

        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(optimizedSvg.data);

    } catch (err) {
        console.error('Error creating Vaisala symbol:', err);
        res.status(500).send('Server error creating Vaisala symbol.');
    }
});

// Load symbol configuration before starting the server
loadSymbolsConfig().then(() => {
    app.listen(port, () => {
        console.log(`SVG server running at http://localhost:${port}`);
    });
});
