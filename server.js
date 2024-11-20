const express = require('express');
const cors = require('cors');
const { dbNeo4j } = require('./database/Neo4jConnection');

class Server {

    constructor() {
        this.app = express();
        this.port = process.env.PORT || 8080;

        this.pathsNeo4j = {
            equipos: '/api/equipos',
            deportistas: '/api/deportistas',
            contrataciones: '/api/contrataciones',
            consultas: '/api/consultas'  // Asegúrate de incluir 'consultas' aquí
        };

        // Conectar a las bases de datos
        this.dbConnectionNeo4j();

        // Middlewares
        this.middlewares();

        // Rutas
        this.routes();
    }

    // Conexión a Neo4j
    async dbConnectionNeo4j() {
        await dbNeo4j();
    }

    // Cargar middlewares
    middlewares() {
        this.app.use(cors());
        this.app.use(express.json());
    }

    // Definir rutas
    routes() {

        // Rutas Neo4j
        this.app.use(this.pathsNeo4j.equipos, require('./routes/equipos'));
        this.app.use(this.pathsNeo4j.deportistas, require('./routes/deportistas'));
        this.app.use(this.pathsNeo4j.contrataciones, require('./routes/contrataciones'));
        this.app.use(this.pathsNeo4j.consultas, require('./routes/consultas')); // Cambiado 'this.paths' por 'this.pathsNeo4j'
    }

    // Iniciar servidor
    listen() {
        this.app.listen(this.port, () => {
            console.log('Servidor corriendo en puerto', this.port);
        });
    }
}

module.exports = Server;
