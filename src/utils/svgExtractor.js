// utils/svgExtractor.js

/**
 * Extracts the main content, <defs> section, and <style> block from an SVG string.
 *
 * This function parses an SVG string to extract its inner content, including any 
 * <defs> and <style> sections. It returns an object containing the extracted content.
 *
 * @param {string} svgString - The SVG string to extract content from.
 * @returns {?Object} An object with `style`, `defs`, and `mainContent` properties or null if SVG is invalid.
 */
function extractSvgContentAndDefs(svgString) {
    const svgRegex = /<svg[^>]*>(.*?)<\/svg>/s;
    const defsRegex = /<defs>(.*?)<\/defs>/s;
    const styleRegex = /<style[^>]*>(.*?)<\/style>/s;

    const match = svgString.match(svgRegex);
    if (!match) return null;

    let innerContent = match[1];

    const styleMatch = innerContent.match(styleRegex);
    const styleContent = styleMatch ? styleMatch[1] : '';
    if (styleMatch) innerContent = innerContent.replace(styleRegex, '');

    const defsMatch = innerContent.match(defsRegex);
    const defsContent = defsMatch ? defsMatch[1] : '';
    if (defsMatch) innerContent = innerContent.replace(defsRegex, '');

    return {
        style: styleContent,
        defs: defsContent,
        mainContent: innerContent.trim(),
    };
}

module.exports = {
    extractSvgContentAndDefs,
};
