const successResponse = (data, message = 'Success', meta = {}) => ({
    success: true,
    data,
    message,
    meta,
});

const errorResponse = (error, message = 'An error occurred', meta = {}) => ({
    success: false,
    error,
    message,
    meta,
});

module.exports = {
    successResponse,
    errorResponse,
};
