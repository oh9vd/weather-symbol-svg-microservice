const { isValidWeatherCode, isValidAngle } = require('../src/utils/validator');
const { expect } = require('chai');

describe('isValidWeatherCode', () => {
    it('should return true for valid Vaisala weather codes', () => {
        expect(isValidWeatherCode('n000')).to.be.true;
        expect(isValidWeatherCode('d121')).to.be.true;
        expect(isValidWeatherCode('n642')).to.be.true;
        expect(isValidWeatherCode('d601')).to.be.true;
        expect(isValidWeatherCode('n341')).to.be.true;
    });

    it('should return false for codes with invalid first character', () => {
        expect(isValidWeatherCode('x123')).to.be.false;
        expect(isValidWeatherCode('a000')).to.be.false;
        expect(isValidWeatherCode('7000')).to.be.false;
    });

    it('should return false for codes with out-of-range digits', () => {
        expect(isValidWeatherCode('n700')).to.be.false; // 7 out of range
        expect(isValidWeatherCode('d065')).to.be.false; // 5 out of range
        expect(isValidWeatherCode('n004')).to.be.false; // 4 is valid, but let's check edge
        expect(isValidWeatherCode('d006')).to.be.false; // 6 out of range for last digit
        expect(isValidWeatherCode('n045')).to.be.false; // 5 out of range for last digit
    });

    it('should return false for codes with incorrect length', () => {
        expect(isValidWeatherCode('n00')).to.be.false;
        expect(isValidWeatherCode('d1234')).to.be.false;
        expect(isValidWeatherCode('n0')).to.be.false;
        expect(isValidWeatherCode('')).to.be.false;
    });

    it('should return false for non-string inputs', () => {
        expect(isValidWeatherCode(null)).to.be.false;
        expect(isValidWeatherCode(undefined)).to.be.false;
        expect(isValidWeatherCode(1234)).to.be.false;
        expect(isValidWeatherCode({})).to.be.false;
        expect(isValidWeatherCode([])).to.be.false;
    });
});

describe('isValidAngle', () => {
    it('should return true for valid angles between 0 and 359', () => {
        expect(isValidAngle(0)).to.be.true;
        expect(isValidAngle(45)).to.be.true;
        expect(isValidAngle(359)).to.be.true;
        expect(isValidAngle(180)).to.be.true;
    });

    it('should return false for angles less than 0 or greater than or equal to 360', () => {
        expect(isValidAngle(-1)).to.be.false;
        expect(isValidAngle(360)).to.be.false;
        expect(isValidAngle(400)).to.be.false;
    });

    it('should return false for non-number inputs', () => {
        expect(isValidAngle('az')).to.be.false;
        expect(isValidAngle(null)).to.be.false;
        expect(isValidAngle(undefined)).to.be.false;
        expect(isValidAngle(NaN)).to.be.false;
        expect(isValidAngle({})).to.be.false;
        expect(isValidAngle([])).to.be.false;
    });
});