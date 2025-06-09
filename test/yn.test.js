const { yn } = require('../src/utils/yn');
const { expect } = require('chai');

describe('yn', () => {
    it('should return true for "y", "yes", "true", "1", "on" (case-insensitive)', () => {
        expect(yn('y')).to.be.true;
        expect(yn('Y')).to.be.true;
        expect(yn('yes')).to.be.true;
        expect(yn('YES')).to.be.true;
        expect(yn('true')).to.be.true;
        expect(yn('TRUE')).to.be.true;
        expect(yn('1')).to.be.true;
        expect(yn(1)).to.be.true;
        expect(yn('on')).to.be.true;
        expect(yn('ON')).to.be.true;
    });

    it('should return false for "n", "no", "false", "0", "off" (case-insensitive)', () => {
        expect(yn('n')).to.be.false;
        expect(yn('no')).to.be.false;
        expect(yn('false')).to.be.false;
        expect(yn('0')).to.be.false;
        expect(yn(0)).to.be.false;
        expect(yn('off')).to.be.false;
    });

    it('should return false for unrelated strings', () => {
        expect(yn('maybe')).to.be.false;
        expect(yn('random')).to.be.false;
        expect(yn('')).to.be.false;
    });

    it('should return false for non-string, non-boolean, non-number types', () => {
        expect(yn(null)).to.be.false;
        expect(yn(undefined)).to.be.false;
        expect(yn({})).to.be.false;
        expect(yn([])).to.be.false;
        expect(yn(() => {})).to.be.false;
    });

    it('should return false for boolean false', () => {
        expect(yn(false)).to.be.false;
    });

    it('should return true for boolean true', () => {
        expect(yn(true)).to.be.true;
    });
});