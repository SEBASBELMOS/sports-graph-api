const { driver } = require('../database/Neo4jConnection');
const neo4j = require('neo4j-driver');

const existeDeportistaPorId = async (id) => {
    const session = driver.session();
    try {
        const result = await session.run(
            'MATCH (d:Deportista) WHERE id(d) = $id RETURN d',
            { id: neo4j.int(id) }
        );
        if (!result.records.length) {
            throw new Error(`El deportista con ID ${id} no existe`);
        }
    } finally {
        await session.close();
    }
};

const noExistenContratacionesPorDeportista = async (id) => {
    const session = driver.session();
    try {
        const result = await session.run(
            'MATCH (d:Deportista)-[:TIENE_CONTRATO]->(:Contrato) WHERE id(d) = $id RETURN COUNT(*) AS count',
            { id: neo4j.int(id) }
        );
        const count = result.records[0].get('count').toNumber();
        if (count > 0) {
            throw new Error(`No se puede eliminar el deportista con ID ${id} porque tiene contrataciones asociadas`);
        }
    } finally {
        await session.close();
    }
};

module.exports = {
    existeDeportistaPorId,
    noExistenContratacionesPorDeportista,
};
