
const express = require('express');
const fs = require('fs').promises;
const optimizer = require('svgo');

const path = require('path');

const app = express();
const port = 4000;

const SVG_ASSETS_DIR = path.join(__dirname, '..', 'svg-assets');
const SYMBOLS_CONFIG_PATH = path.join(SVG_ASSETS_DIR, 'symbols-config.json');

let symbolsConfig = {};

async function loadSymbolsConfig() {
    try {
        const data = await fs.readFile(SYMBOLS_CONFIG_PATH, 'utf8');
        symbolsConfig = JSON.parse(data);
        console.log('Symbolikonfiguraatio ladattu onnistuneesti.');
    } catch (err) {
        console.error('VIRHE: Symbolikonfiguraation lataaminen epäonnistui:', err);
        process.exit(1);
    }
}

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
        mainContent: innerContent.trim()
    };
}

// === Tuulen nuolen endpoint (sama kuin aiemmin, jos et muuta sitä tiedostopohjaiseksi) ===
const BASE_WIND_ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="red" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /></svg>`;
const svgCenterX = 12;
const svgCenterY = 12;

app.get('/wind_direction_svgs', (req, res) => {
  const directionDegrees = parseInt(req.query.angle, 10);
  if (isNaN(directionDegrees) || directionDegrees < 0 || directionDegrees >= 360) {
    return res.status(400).send('Virheellinen tai puuttuva "angle" parametri (0-359 astetta).');
  }
  const transformAttr = `rotate(${directionDegrees} ${svgCenterX} ${svgCenterY})`;
  const svgRegex = /<svg([^>]*)>(.*?)<\/svg>/s;
  const match = BASE_WIND_ARROW_SVG.match(svgRegex);

  let finalSvgContent = '';
  if (match && match.length === 3) {
    const svgAttributes = match[1];
    const innerSvgContent = match[2];
    finalSvgContent = `<svg${svgAttributes}><g transform="${transformAttr}">${innerSvgContent}</g></svg>`;
  } else {
    console.error('Virhe BASE_WIND_ARROW_SVG -merkkijonon parsinnassa.');
    return res.status(500).send('Palvelinvirhe SVG-kuvan luomisessa.');
  }
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(finalSvgContent);
});

app.get('/', (req, res) => {
  res.send('Minimal Test');
});

// === Yleinen symbolien endpoint (korvaa aiemman '/symbol/:symbol_name') ===
app.get('/symbol/:symbol_name', async (req, res) => {
    const symbolName = req.params.symbol_name;
    const symbolConfig = symbolsConfig.elements[symbolName];

    if (!symbolConfig) {
        return res.status(404).send('SVG-symbolia ei löytynyt annetulla nimellä.');
    }

    try {
        const svgPath = path.join(SVG_ASSETS_DIR, symbolConfig.path);
        const svgContent = await fs.readFile(svgPath, 'utf8');
        
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svgContent);
    } catch (err) {
        console.error(`Virhe symbolin '${symbolName}' lataamisessa:`, err);
        res.status(500).send('Palvelinvirhe SVG-symbolin lataamisessa.');
    }
});

/**
 * Parsii Vaisalan sääkoodin ja palauttaa listan yhdistettävistä SVG-komponenteista.
 * @param {string} weatherCode Vaisalan sääkoodi (esim. 'd220')
 * @returns {Array} Lista komponenttiobjekteista (nimi, sijainti, skaalaus, animaatio)
 */
function parseVaisalaWeatherCode(weatherCode) {
    if (typeof weatherCode !== 'string' || weatherCode.length !== 4) {
        return []; // Palauta tyhjä, jos koodi ei ole oikeanlainen
    }

    const dayNight = weatherCode[0]; // 'd' tai 'n'
    const cloudiness = parseInt(weatherCode[1], 10);
    const precipitationRate = parseInt(weatherCode[2], 10);
    const precipitationType = parseInt(weatherCode[3], 10);

    const components = [];

    // Lisää pääelementti (aurinko/kuu)
    if (dayNight === 'd' && cloudiness <= 2) { // Kirkas tai melkein/puolipilvinen päivä
        components.push({ name: 'sun-base', x: 0, y: 0, scale: 1 });
        // Jos pilvisyyttä, sijoita aurinko/kuu hieman sivuun
        if (cloudiness === 1) { // Melkein selkeä
             components[0].x = -15; // Siirrä aurinkoa vasemmalle
             components[0].y = -15;
             components[0].scale = 0.7; // Pienennä aurinkoa hieman
        } else if (cloudiness === 2) { // Puolipilvinen
             components[0].x = -15;
             components[0].y = -15;
             components[0].scale = 0.7;
        }
    } else if (dayNight === 'n' && cloudiness <= 2) { // Kirkas tai melkein/puolipilvinen yö
        components.push({ name: 'moon-crescent', x: 0, y: 0, scale: 1 });
        if (cloudiness === 1) {
            components[0].x = -15;
            components[0].y = -15;
            components[0].scale = 0.7;
        } else if (cloudiness === 2) {
            components[0].x = -15;
            components[0].y = -15;
            components[0].scale = 0.7;
        }
    }

    // Lisää pilvet pilvisyyden mukaan
    let cloudElement = null;
    let cloudX = 0;
    let cloudY = 0;
    let cloudScale = 1;
 
    switch (cloudiness) {
        case 0: // Selkeä - ei pilviä (paitsi jos on sadetta/ukkonen, jolloin lisätään pilvi myöhemmin)
            break;
        case 1: // Melkein selkeä - pieni pilvi
            cloudElement = 'cloud-base';
            cloudX = 10;
            cloudY = 10;
            cloudScale = 0.9;
            break;
        case 2: // Puolipilvinen - normaali pilvi
            cloudElement = 'cloud-base';
            cloudX = 0;
            cloudY = 0;
            cloudScale = 1;
            break;
        case 3: // Hajanainen pilvisyys - ehkä cloud-broken
            cloudElement = 'cloud-broken';
            cloudX = 0;
            cloudY = 0;
            cloudScale = 1;
            break;
        case 4: // Pilvinen - cloud-overcast
            cloudElement = 'cloud-overcast';
            cloudX = 0;
            cloudY = 0;
            cloudScale = 1.1; // Hieman isompi
            break;
        case 5: // Ohuet yläpilvet - oma symboli tai cloud-base pienemmällä opacitylla
            cloudElement = 'cloud-base';
            cloudX = 0;
            cloudY = 0;
            cloudScale = 1;
            // Voitaisiin lisätä opacity:n hallinta tässä, jos elementti tukee sitä.
            break;
        case 6: // Sumu
            cloudElement = 'fog-symbol'; // Oletetaan, että sumu on pilven tyyppinen elementti
            cloudX = 0;
            cloudY = 0;
            cloudScale = 1.2; // Sumu voi olla laaja
            break;
    }

    // Lisää pilvi, jos sellainen on määritelty TAI jos on sadetta/ukkonen (vaikka pilvisyys olisi 0)
    if (cloudElement || precipitationRate > 0) {
        // Jos pilvisyys oli 0 mutta sataa/ukkonen, lisää automaattisesti pilvinen pilvi
        if (!cloudElement && precipitationRate > 0) {
            cloudElement = 'cloud-overcast'; // Sade vaatii pilven
            cloudX = 0;
            cloudY = 0;
            cloudScale = 1;
        }
        if (cloudElement) {
             components.push({ name: cloudElement, x: cloudX, y: cloudY, scale: cloudScale});
        }
    }


    // Lisää sade tyypin ja määrän mukaan
    if (precipitationRate > 0) {
        let precipitationElement = '';
        let precipYOffset = 30; // Oletussijainti pilven alla

        switch (precipitationType) {
            case 0: precipitationElement = 'rain-drops'; break;
            case 1: precipitationElement = 'sleet-symbol'; break;
            case 2: precipitationElement = 'snow-flakes'; break;
        }

        if (precipitationElement) {
            // Voit säätää sijaintia ja skaalausta sademäärän mukaan
            if (precipitationRate === 1) { // Vähäinen sade
                components.push({ name: precipitationElement, x: 10, y: precipYOffset, scale: 0.7 });
            } else if (precipitationRate === 2) { // Kuuroja
                components.push({ name: precipitationElement, x: 0, y: precipYOffset, scale: 1 });
            } else if (precipitationRate === 3) { // Jatkuva sade
                components.push({ name: precipitationElement, x: 0, y: precipYOffset, scale: 1.2 });
            } else if (precipitationRate === 4) { // Ukkonen (lisää salama ja sade/räntä/lumi)
                components.push({ name: 'thunderbolt', x: 0, y: 15, scale: 1.2 }); // Salaman sijainti
                // Jatka sitten varsinaisen sadetyypin lisäyksellä
                components.push({ name: precipitationElement, x: 0, y: precipYOffset + 10, scale: 1.1 });
            }
        }
    }
    
    return components;
}

// === Uusi endpoint Vaisalan sääkoodeille ===
app.get('/vaisala_symbol/:weather_code', async (req, res) => {
    const weatherCode = req.params.weather_code;
    const viewBox = req.query.viewBox || "0 0 64 64";
    const width = req.query.width || "64";
    const height = req.query.height || "64";

    // Jäsennä Vaisalan sääkoodi komponenteiksi
    const elementsToCombine = parseVaisalaWeatherCode(weatherCode);

    if (elementsToCombine.length === 0) {
        return res.status(400).send('Virheellinen tai käsittelemätön Vaisala-sääkoodi.');
    }

    let combinedSvgContent = '';
    let combinedStyles = '';
    let combinedDefs = new Set();

    try {
        const elementPromises = elementsToCombine.map(comp => {
            const elementConfig = symbolsConfig.elements[comp.name];
            if (!elementConfig) {
                throw new Error(`SVG-komponenttia '${comp.name}' ei löydy symbols-config.jsonista.`);
            }
            const svgPath = path.join(SVG_ASSETS_DIR, elementConfig.path);
            return fs.readFile(svgPath, 'utf8');
        });

        const rawSvgContents = await Promise.all(elementPromises);

        for (let i = 0; i < elementsToCombine.length; i++) {
            const comp = elementsToCombine[i];
            const svgRaw = rawSvgContents[i];
            
            const parsed = extractSvgContentAndDefs(svgRaw);

            if (parsed) {
                combinedStyles += parsed.style + '\n';
                if (parsed.defs) {
                    combinedDefs.add(parsed.defs);
                }

                let transform = `translate(${comp.x || 0} ${comp.y || 0}) scale(${comp.scale || 1})`;
                if (comp.rotation) {
                    transform += ` rotate(${comp.rotation.angle} ${comp.rotation.cx} ${comp.rotation.cy})`;
                }
                
                combinedSvgContent += `
                    <g transform="${transform}">
                        ${parsed.mainContent}
                    </g>
                `;
            }
        }

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

        const optSvg = optimizer.optimize(finalSvg, null);

        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(optSvg.data);

    } catch (err) {
        console.error('Virhe Vaisala-symbolin luomisessa:', err);
        res.status(500).send('Palvelinvirhe Vaisala-symbolin luomisessa.');
    }
});

loadSymbolsConfig().then(() => {
    app.listen(port, () => {
        console.log(`SVG-palvelin käynnissä osoitteessa http://localhost:${port}`);
    });
});