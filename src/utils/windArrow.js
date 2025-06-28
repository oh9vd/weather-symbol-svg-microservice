/**
 * Generates a wind arrow SVG with a stationary circle (showing wind speed)
 * and a rotating triangle (showing wind direction).
 * The SVG is styled for good visibility on both dark and light backgrounds.
 *
 * @param {number} directionDegrees - Wind direction in degrees (0 = north, 90 = east, etc.).
 * @param {number|string} speed - Wind speed to display inside the circle.
 * @param {object} [options] - Optional customization (size, theme, etc.).
 * @returns {string} SVG string.
 */
function generateWindArrowSvg( directionDegrees, speed, options = {}) {
    const viewBox = options.viewBox || '0 0 64 64';
    const size = options.size || 64;
    const circleRadius = options.circleRadius || 18;
    const triangleHeight = options.triangleHeight || 18;
    const triangleBase = options.triangleBase || 14;
    const center = size / 2;

    // Theme colors for light/dark backgrounds
    const theme = options.theme || 'auto'; // 'auto', 'light', or 'dark'
    let circleFill = 'white', circleStroke = '#333', textFill = '#222', textStroke = 'white', triangleFill = '#1976d2', triangleStroke = '#222';
    if (theme === 'dark') {
        circleFill = '#222';
        circleStroke = '#eee';
        textFill = '#eee';
        textStroke = '#222';
        triangleStroke = '#eee';
    } else if (theme === 'auto') {
        // Use a semi-transparent background for the circle for best contrast
        circleFill = 'rgba(255,255,255,0.85)';
    }

    // Triangle points (pointing up, centered horizontally above the circle)
    const trianglePoints = [
        [center, center - circleRadius - triangleHeight], // tip
        [center - triangleBase / 2, center - circleRadius], // left base
        [center + triangleBase / 2, center - circleRadius]  // right base
    ].map(p => p.join(',')).join(' ');

    return `
<svg width="${size}" height="${size}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style type="text/css">
      .circle { fill: ${circleFill}; stroke: ${circleStroke}; stroke-width: 2; }
      .speed-text {
        font-size: 18px;
        font-family: Arial, sans-serif;
        fill: ${textFill};
        stroke: ${textStroke};
        stroke-width: 1.2;
        paint-order: stroke fill;
        dominant-baseline: middle;
        text-anchor: middle;
      }
      .triangle {
        fill: ${triangleFill};
        stroke: ${triangleStroke};
        stroke-width: 2;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
      }
    </style>
  </defs>
  <!-- Stationary circle for wind speed -->
  <circle class="circle" cx="${center}" cy="${center}" r="${circleRadius}"/>
  <!-- Wind speed text -->
  <text class="speed-text" x="${center}" y="${center}">${speed}</text>
  <!-- Rotating triangle for wind direction -->
  <g transform="rotate(${directionDegrees + 180} ${center} ${center})">
    <polygon class="triangle" points="${trianglePoints}"/>
  </g>
</svg>
`.trim();
}

module.exports = {
    generateWindArrowSvg,
};