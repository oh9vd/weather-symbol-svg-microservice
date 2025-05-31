const express = require('express');
const fs = require('fs').promises;
const { optimize } = require('svgo');
const path = require('path');

const app = express();
const port = 4000;

// Define directories for SVG assets and configuration
const SVG_ASSETS_DIR = path.join(__dirname, '..', 'svg-assets');
const SVG_ELEMENTS_DIR = path.join(SVG_ASSETS_DIR, 'elements');
const SYMBOLS_CONFIG_PATH = path.join(SVG_ASSETS_DIR, 'symbols-config.json');

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
app.get('/wind_direction_svgs/:angle', async (req, res) => {
    const directionDegrees = parseInt(req.params.angle, 10);
    if (isNaN(directionDegrees) || directionDegrees < 0 || directionDegrees >= 360) {
        return res.status(400).send('Invalid or missing "angle" parameter (0-359 degrees).');
    }

    const symbolName = 'wind-arrow';

    try {
        const svgPath = path.join(SVG_ASSETS_DIR, `${symbolName}.svg`);
        const baseWindArrowSvg  = await fs.readFile(svgPath, 'utf8');

        const transformAttr = `rotate(${directionDegrees} 12 12)`;
        const svgRegex = /<svg([^>]*)>(.*?)<\/svg>/s;
        const match = baseWindArrowSvg.match(svgRegex);

        if (match && match.length === 3) {
            const svgAttributes = match[1];
            const innerSvgContent = match[2];
            const finalSvg = 
                `<svg${svgAttributes}>
                    <g transform="${transformAttr}">
                        ${innerSvgContent}
                    </g>
                </svg>`;
            const optimizedSvg = optimize(finalSvg, { multipass: true });                
            
            res.setHeader('Content-Type', 'image/svg+xml');
            res.send(optimizedSvg.data);
        } else {
            console.error('Error parsing BASE_WIND_ARROW_SVG string.');
            res.status(500).send('Server error creating SVG image.');
        }
    } catch (err) {
        console.error(`Error loading symbol '${symbolName}':`, err);
        res.status(500).send('Server error loading SVG symbol.');
    }
});

// Parse Vaisala weather code to determine SVG components
function parseVaisalaWeatherCode(weatherCode) {
    if (typeof weatherCode !== 'string' || weatherCode.length !== 4) {
        return []; // Return empty in error 
    }

    const dayNight = weatherCode[0];
    const cloudiness = parseInt(weatherCode[1], 10);
    const precipitationRate = parseInt(weatherCode[2], 10);
    const precipitationType = parseInt(weatherCode[3], 10);

    const components = [];

    // Add sun or moon based on day or night
    if (cloudiness !== 4) {
        const celestialBody = dayNight === 'd' ? 'sun' : 'moon';
        components.push({ name: celestialBody, x: 0, y: 0, scale: 1 });
    }

    // Add cloudiness
    if (cloudiness > 0) {
        components.push({ name: `cloud-${cloudiness}`, x: 0, y: 0, scale: 1 });
    }

     // Add precipitation: rain/sleet/snow/thunder
    if (precipitationRate > 0) {
        const precipNamePrefix = precipitationRate < 4 ? precipitationRate : precipitationRate - 2;
        const precipNameSuffix = precipitationRate < 4 ? precipitationType : '0';
        const precipName = `precip-${precipNamePrefix}${precipNameSuffix}`;

        components.push({ name: precipName, x: 0, y: 30, scale: 1 });

        if (precipitationRate >= 4) {
            components.push({ name: 'thunderbolt', x: 0, y: 15, scale: 1.2 });
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
            const svgPath = path.join(SVG_ELEMENTS_DIR, `${comp.name}.svg`);
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

app.listen(port, () => {
    console.log(`SVG server running at http://localhost:${port}`);
});
