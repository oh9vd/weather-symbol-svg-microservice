// utils/validator.js

/**
 * Checks if the provided weather code is valid based on Vaisala coding standards.
 *
 * Vaisala weather codes are structured with:
 * - First character as 'n' or 'd'
 * - Second character between 0 and 6
 * - Third character between 0 and 4
 * - Fourth character between 0 and 2
 *
 * @param {string} weatherCode - The weather code to validate.
 * @returns {boolean} Returns `true` if the weather code is valid, otherwise `false`.
 */
function isValidWeatherCode(weatherCode) {
    // Regex for Vaisala weather codes: first char 'n' or 'd',
    // second char 0-6, third char 0-4, fourth char 0-2
    const regex = /^[nd][0-6][0-4][0-2]$/;
    return typeof weatherCode === 'string' && regex.test(weatherCode);
}

/**
 * Validates whether the given angle is a number within the range of 0 to 359 degrees.
 *
 * @param {any} angle - The angle to validate.
 * @returns {boolean} Returns `true` if the angle is a valid number, otherwise `false`.
 */
function isValidAngle(angle) {
    // Return true only if angle is a number between 0 and 359
    return typeof angle === 'number' && angle >= 0 && angle < 360;
}

module.exports = {
    isValidWeatherCode,
    isValidAngle,
};