// Middleware for handling 404 errors
const notFoundHandler = (req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
};

// Middleware for general error handling
const errorHandler = (err, req, res, next) => {
    res.status(err.status || 500);
    res.json({
        error: {
            message: err.message,
        },
    });
};

module.exports = { notFoundHandler, errorHandler };
