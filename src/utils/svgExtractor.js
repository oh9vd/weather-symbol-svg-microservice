// utils/svgExtractor.js
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

module.exports = {
    extractSvgContentAndDefs,
};