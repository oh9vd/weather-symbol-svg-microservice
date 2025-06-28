// Generates a wind arrow SVG with a stationary circle and wind speed, and a rotating triangle for direction
export function generateWindArrowSvg(speed, directionDegrees, options = {}) {
    const size = options.size || 48;
    const circleRadius = options.circleRadius || 16;
    const triangleHeight = options.triangleHeight || 14;
    const triangleBase = options.triangleBase || 10;
    const center = size / 2;

    // Triangle points (pointing up, centered horizontally above the circle)
    const trianglePoints = [
        [center, center - circleRadius - triangleHeight], // tip
        [center - triangleBase / 2, center - circleRadius], // left base
        [center + triangleBase / 2, center - circleRadius]  // right base
    ].map(p => p.join(',')).join(' ');

    return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style type="text/css">
      .circle { fill: white; stroke: #333; stroke-width: 2; }
      .speed-text { font-size: 14px; font-family: Arial, sans-serif; fill: #333; dominant-baseline: middle; text-anchor: middle; }
      .triangle { fill: #1976d2; stroke: #333; stroke-width: 1; }
    </style>
  </defs>
  <!-- Stationary circle for wind speed -->
  <circle class="circle" cx="${center}" cy="${center}" r="${circleRadius}"/>
  <!-- Wind speed text -->
  <text class="speed-text" x="${center}" y="${center}">${speed}</text>
  <!-- Rotating triangle for wind direction -->
  <g transform="rotate(${directionDegrees} ${center} ${center})">
    <polygon class="triangle" points="${trianglePoints}"/>
  </g>
</svg>
`.trim();
}