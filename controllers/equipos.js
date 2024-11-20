const { response } = require("express");
const { driver } = require('../database/Neo4jConnection');
const neo4j = require('neo4j-driver');

const obtenerEquiposGet = async (req, res = response) => {
    const session = driver.session();
    const { limite = 5, desde = 0 } = req.query;

    try {
        const result = await session.run(
            `
            MATCH (e:Equipo)-[:PRACTICA_DEPORTE]->(d:Deporte)
            RETURN id(e) AS id, e, d
            ORDER BY e.nombre_equipo
            SKIP $desde LIMIT $limite
            `,
            {
                desde: neo4j.int(desde),
                limite: neo4j.int(limite)
            }
        );

        const equipos = result.records.map(record => ({
            id: record.get('id'),
            nombre_equipo: record.get('e').properties.nombre_equipo,
            ciudadOrigen: record.get('e').properties.ciudadOrigen,
            deporte: record.get('d').properties.nombre_deporte
        }));

        res.json({ equipos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener los equipos' });
    } finally {
        await session.close();
    }
};

const obtenerEquipoGet = async (req, res = response) => {
    const { id } = req.params;
    const session = driver.session();

    try {
        const result = await session.run(
            `
            MATCH (e:Equipo)-[:PRACTICA_DEPORTE]->(d:Deporte)
            WHERE id(e) = $id
            RETURN e, d
            `,
            { id: neo4j.int(id) }
        );

        if (!result.records.length) {
            return res.status(404).json({ msg: 'Equipo no encontrado' });
        }

        const record = result.records[0];
        const equipo = {
            id: id,
            equipo: record.get('e').properties,
            ciudadOrigen: record.get('e').properties.ciudadOrigen,
            deporte: record.get('d').properties
        };

        res.json({ equipo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener el equipo' });
    } finally {
        await session.close();
    }
};

const crearEquipoPost = async (req, res = response) => {
    const session = driver.session();
    const { nombre_equipo, pais, deporteNombre } = req.body;

    try {
        // Verificar si el equipo ya existe
        const equipoExistente = await session.run(
            `
            MATCH (e:Equipo {nombre_equipo: $nombre_equipo, pais: $pais})
            RETURN e
            `,
            { nombre_equipo, pais }
        );

        if (equipoExistente.records.length) {
            return res.status(400).json({
                msg: `El equipo ${nombre_equipo} en el país ${pais} ya existe en la BD.`
            });
        }

        // Verificar si el deporte existe, si no, crearlo
        await session.run(
            `
            MERGE (d:Deporte {nombre: $deporteNombre})
            `,
            { deporteNombre }
        );

        // Crear el equipo y relacionarlo con el deporte
        const result = await session.run(
            `
            MATCH (d:Deporte {nombre: $deporteNombre})
            CREATE (e:Equipo {nombre_equipo: $nombre_equipo, pais: $pais})
            CREATE (e)-[:PRACTICA_DEPORTE]->(d)
            RETURN e, d
            `,
            { nombre_equipo, pais, deporteNombre }
        );

        const equipoCreado = result.records[0].get('e').properties;

        res.json({ msg: 'Equipo creado correctamente', equipo: equipoCreado });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear el equipo' });
    } finally {
        await session.close();
    }
};

const actualizarEquipoPut = async (req, res = response) => {
    const { id } = req.params;
    const { nombre_equipo, pais, deporteNombre } = req.body;
    const session = driver.session();

    try {
        // Verificar si ya existe otro equipo con el mismo nombre y país
        const equipoExistente = await session.run(
            `
            MATCH (e:Equipo {nombre_equipo: $nombre_equipo, pais: $pais})
            WHERE id(e) <> $id
            RETURN e
            `,
            {
                id: neo4j.int(id),
                nombre_equipo,
                pais
            }
        );

        if (equipoExistente.records.length) {
            return res.status(400).json({
                msg: `El equipo ${nombre_equipo} en el país ${pais} ya existe en la BD.`
            });
        }

        // Actualizar los datos del equipo
        await session.run(
            `
            MATCH (e:Equipo)
            WHERE id(e) = $id
            SET e.nombre_equipo = $nombre_equipo,
                e.pais = $pais
            `,
            {
                id: neo4j.int(id),
                nombre_equipo,
                pais
            }
        );

        // Actualizar el deporte si se proporciona
        if (deporteNombre) {
            // Verificar si el deporte existe, si no, crearlo
            await session.run(
                `
                MERGE (d:Deporte {nombre: $deporteNombre})
                `,
                { deporteNombre }
            );

            // Actualizar la relación PRACTICA_DEPORTE
            await session.run(
                `
                MATCH (e:Equipo)-[r:PRACTICA_DEPORTE]->(:Deporte)
                WHERE id(e) = $id
                DELETE r
                WITH e
                MATCH (d:Deporte {nombre: $deporteNombre})
                CREATE (e)-[:PRACTICA_DEPORTE]->(d)
                `,
                {
                    id: neo4j.int(id),
                    deporteNombre
                }
            );
        }

        res.json({ msg: 'Equipo actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar el equipo' });
    } finally {
        await session.close();
    }
};

const borrarEquipoDelete = async (req, res = response) => {
    const { id } = req.params;
    const session = driver.session();

    try {
        // Verificar si el equipo tiene deportistas o contrataciones asociadas
        const relacionesResult = await session.run(
            `
            MATCH (e:Equipo)<-[:JUEGA_EN]-(d:Deportista)
            WHERE id(e) = $id
            RETURN d LIMIT 1
            `,
            { id: neo4j.int(id) }
        );

        if (relacionesResult.records.length) {
            return res.status(400).json({
                msg: 'No se puede eliminar el equipo porque tiene deportistas asociados'
            });
        }

        // Eliminar el equipo
        await session.run(
            `
            MATCH (e:Equipo)
            WHERE id(e) = $id
            DETACH DELETE e
            `,
            { id: neo4j.int(id) }
        );

        res.json({ msg: 'Equipo eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al eliminar el equipo' });
    } finally {
        await session.close();
    }
};

module.exports = {
    obtenerEquiposGet,
    obtenerEquipoGet,
    crearEquipoPost,
    actualizarEquipoPut,
    borrarEquipoDelete
};
