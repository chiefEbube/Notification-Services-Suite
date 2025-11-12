const successResponse = (data, message = 'Success', meta = {}) => ({
    success: true,
    data,
    message,
    meta,
});

const errorResponse = (error, message = 'An error occurred', data = null) => ({
    success: false,
    error,
    message,
    data,
    meta: {},
});

module.exports = {
    successResponse,
    errorResponse,
};
