// utils/validator.js
function isValidWeatherCode(weatherCode) {
    // Regex for Vaisala weather codes: first char 'n' or 'd',
    // second char 0-6, third char 0-4, fourth char 0-2
    const regex = /^[nd][0-6][0-4][0-2]$/;
    return typeof weatherCode === 'string' && regex.test(weatherCode);
}

function isValidAngle(angle) {
    // Validate if angle is a number between 0 and 359
    return !isNaN(angle) && angle >= 0 && angle < 360;
}

module.exports = {
    isValidWeatherCode,
    isValidAngle,
};