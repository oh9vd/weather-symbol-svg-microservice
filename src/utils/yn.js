
/**
 * Checks if the given value is equivalent to a boolean "yes" or "true".
 * It matches values like 'y', 'yes', 'true', '1', and 'on' (case-insensitive).
 *
 * @param {string|boolean|number} value - The value to be evaluated.
 * @returns {boolean} Returns true if the input matches a "yes"/"true" pattern, false otherwise.
 */
function yn(value) {
    if (typeof value !== 'string' && typeof value !== 'boolean' && typeof value !== 'number') {
        return false;
    }
    return /^(?:y|yes|true|1|on)$/i.test(String(value).toLowerCase());
}

module.exports = {
    yn
};