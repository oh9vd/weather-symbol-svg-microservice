const { extractSvgContentAndDefs } = require('../src/utils/svgExtractor');
const { expect } = require('chai');

describe('extractSvgContentAndDefs', () => {
    it('should extract style, defs, and mainContent from a full SVG', () => {
        const svg = `
            <svg width="100" height="100">
                <style>.cls{fill:red;}</style>
                <defs><circle id="c" r="10"/></defs>
                <rect class="cls" width="100" height="100"/>
            </svg>
        `;
        const result = extractSvgContentAndDefs(svg);
        expect(result).to.deep.equal({
            style: '.cls{fill:red;}',
            defs: '<circle id="c" r="10"/>',
            mainContent: '<rect class="cls" width="100" height="100"/>'
        });
    });

    it('should extract only style if defs is missing', () => {
        const svg = `
            <svg>
                <style>.a{}</style>
                <g></g>
            </svg>
        `;
        const result = extractSvgContentAndDefs(svg);
        expect(result).to.deep.equal({
            style: '.a{}',
            defs: '',
            mainContent: '<g></g>'
        });
    });

    it('should extract only defs if style is missing', () => {
        const svg = `
            <svg>
                <defs><path d="M0 0"/></defs>
                <ellipse/>
            </svg>
        `;
        const result = extractSvgContentAndDefs(svg);
        expect(result).to.deep.equal({
            style: '',
            defs: '<path d="M0 0"/>',
            mainContent: '<ellipse/>'
        });
    });

    it('should extract mainContent if both style and defs are missing', () => {
        const svg = `<svg><line x1="0" y1="0" x2="1" y2="1"/></svg>`;
        const result = extractSvgContentAndDefs(svg);
        expect(result).to.deep.equal({
            style: '',
            defs: '',
            mainContent: '<line x1="0" y1="0" x2="1" y2="1"/>'
        });
    });

    it('should return null for invalid SVG input', () => {
        expect(extractSvgContentAndDefs('not an svg')).to.be.null;
        expect(extractSvgContentAndDefs('')).to.be.null;
        expect(extractSvgContentAndDefs('<svg></svgg>')).to.be.null;
    });

    it('should handle SVG with style and defs in different order', () => {
        const svg = `
            <svg>
                <defs><rect id="r"/></defs>
                <style>.b{}</style>
                <circle/>
            </svg>
        `;
        const result = extractSvgContentAndDefs(svg);
        expect(result).to.deep.equal({
            style: '.b{}',
            defs: '<rect id="r"/>',
            mainContent: '<circle/>'
        });
    });
});