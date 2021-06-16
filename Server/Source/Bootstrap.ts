import * as socketIo from "socket.io";
import http from 'http';

export function bootstrap () {
    const httpServer = http.createServer();
    httpServer.listen(8087, '0.0.0.0');

    const serverIo = new socketIo.Server();
    serverIo.listen(httpServer);

    serverIo.on('data', (data) => {
        
    });
}
