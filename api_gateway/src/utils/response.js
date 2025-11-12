// api_gateway/src/utils/response.js

/**
 * Generates a standardized success response object.
 * @param {object} data - The data payload for the response. Defaults to an empty object.
 * @param {string} message - A descriptive success message. Defaults to an empty string.
 * @param {object} meta - Metadata related to the response, e.g., pagination. Defaults to an empty object.
 * @returns {object} A success response object.
 */
function successResponse(data = {}, message = "", meta = {}) {
    return {
        success: true,
        data: data,
        message: message,
        meta: meta,
    };
}

/**
 * Generates a standardized error response object.
 * @param {string} error - A string representing the error type or code.
 * @param {string} message - A descriptive error message. Defaults to an empty string.
 * @param {object} meta - Metadata related to the error, e.g., error codes. Defaults to an empty object.
 * @returns {object} An error response object.
 */
function errorResponse(error, message = "", meta = {}) {
    return {
        success: false,
        error: error,
        message: message,
        meta: meta,
    };
}

module.exports = {
    successResponse,
    errorResponse,
};
