const socketIo = require("socket.io");

module.exports = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`A user connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`A user disconnected: ${socket.id}`);
        });
    });

    return io;
};
