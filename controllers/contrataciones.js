const { response } = require('express');
const { driver } = require('../database/Neo4jConnection');
const neo4j = require('neo4j-driver');

const crearContratacion = async (req, res = response) => {
    const session = driver.session();
    const { deportistaId, equipoId, fecha_inicio, fecha_fin, valor_contrato } = req.body;

    try {
        // Verificar que el deportista existe
        const deportistaResult = await session.run(
            'MATCH (d:Deportista) WHERE id(d) = $deportistaId RETURN d',
            { deportistaId: neo4j.int(deportistaId) }
        );
        if (!deportistaResult.records.length) {
            return res.status(400).json({ msg: 'El deportista especificado no existe' });
        }

        // Verificar que el equipo existe
        const equipoResult = await session.run(
            'MATCH (e:Equipo) WHERE id(e) = $equipoId RETURN e',
            { equipoId: neo4j.int(equipoId) }
        );
        if (!equipoResult.records.length) {
            return res.status(400).json({ msg: 'El equipo especificado no existe' });
        }

        // Verificar si ya existe una contratación activa
        const contratacionResult = await session.run(
            `
            MATCH (d:Deportista)-[:TIENE_CONTRATO]->(c:Contrato)-[:CONTRATO_CON]->(e:Equipo)
            WHERE id(d) = $deportistaId AND id(e) = $equipoId
            AND c.fecha_inicio <= date($fecha_fin) AND c.fecha_fin >= date($fecha_inicio)
            RETURN c
            `,
            {
                deportistaId: neo4j.int(deportistaId),
                equipoId: neo4j.int(equipoId),
                fecha_inicio,
                fecha_fin
            }
        );

        if (contratacionResult.records.length) {
            return res.status(400).json({ msg: 'Ya existe una contratación activa para este deportista en el equipo durante el periodo especificado' });
        }

        // Crear el contrato y las relaciones
        const result = await session.run(
            `
            MATCH (d:Deportista), (e:Equipo)
            WHERE id(d) = $deportistaId AND id(e) = $equipoId
            CREATE (d)-[:TIENE_CONTRATO]->(c:Contrato {
                fecha_inicio: date($fecha_inicio),
                fecha_fin: date($fecha_fin),
                valor_contrato: $valor_contrato
            })-[:CONTRATO_CON]->(e)
            RETURN c, d, e
            `,
            {
                deportistaId: neo4j.int(deportistaId),
                equipoId: neo4j.int(equipoId),
                fecha_inicio,
                fecha_fin,
                valor_contrato: neo4j.int(valor_contrato)
            }
        );

        const contratoCreado = result.records[0].get('c').properties;

        res.json({ msg: 'Contratación creada correctamente', contrato: contratoCreado });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear la contratación' });
    } finally {
        await session.close();
    }
};

const obtenerContrataciones = async (req, res = response) => {
    const session = driver.session();

    try {
        const result = await session.run(
            `
            MATCH (d:Deportista)-[:TIENE_CONTRATO]->(c:Contrato)-[:CONTRATO_CON]->(e:Equipo)
            RETURN id(c) AS id, d, c, e
            `
        );

        const contrataciones = result.records.map(record => ({
            id: record.get('id').toNumber(),
            deportista: record.get('d').properties,
            contrato: record.get('c').properties,
            equipo: record.get('e').properties
        }));

        res.json({ total: contrataciones.length, contrataciones });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener las contrataciones' });
    } finally {
        await session.close();
    }
};

const obtenerContratacionPorId = async (req, res = response) => {
    const { id } = req.params;
    const session = driver.session();

    try {
        const result = await session.run(
            `
            MATCH (d:Deportista)-[:TIENE_CONTRATO]->(c:Contrato)-[:CONTRATO_CON]->(e:Equipo)
            WHERE id(c) = $id
            RETURN id(c) AS id, d, c, e
            `,
            { id: neo4j.int(id) }
        );

        if (!result.records.length) {
            return res.status(404).json({ msg: 'Contratación no encontrada' });
        }

        const record = result.records[0];
        const contratacion = {
            id: record.get('id').toNumber(),
            deportista: record.get('d').properties,
            contrato: record.get('c').properties,
            equipo: record.get('e').properties
        };

        res.json(contratacion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener la contratación' });
    } finally {
        await session.close();
    }
};

const modificarContratacion = async (req, res = response) => {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin, valor_contrato } = req.body;
    const session = driver.session();

    try {
        const result = await session.run(
            `
            MATCH (c:Contrato)
            WHERE id(c) = $id
            SET c.fecha_inicio = date($fecha_inicio),
                c.fecha_fin = date($fecha_fin),
                c.valor_contrato = $valor_contrato
            RETURN c
            `,
            {
                id: neo4j.int(id),
                fecha_inicio,
                fecha_fin,
                valor_contrato: neo4j.int(valor_contrato)
            }
        );

        if (!result.records.length) {
            return res.status(404).json({ msg: 'Contratación no encontrada' });
        }

        const contratoActualizado = result.records[0].get('c').properties;

        res.json({ msg: 'Contratación actualizada correctamente', contrato: contratoActualizado });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al modificar la contratación' });
    } finally {
        await session.close();
    }
};

const eliminarContratacion = async (req, res = response) => {
    const { id } = req.params;
    const session = driver.session();

    try {
        const result = await session.run(
            `
            MATCH (d:Deportista)-[r1:TIENE_CONTRATO]->(c:Contrato)-[r2:CONTRATO_CON]->(e:Equipo)
            WHERE id(c) = $id
            DELETE r1, r2, c
            RETURN c
            `,
            { id: neo4j.int(id) }
        );

        if (!result.records.length) {
            return res.status(404).json({ msg: 'Contratación no encontrada' });
        }

        res.json({ msg: 'Contratación eliminada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al eliminar la contratación' });
    } finally {
        await session.close();
    }
};

module.exports = {
    crearContratacion,
    obtenerContrataciones,
    obtenerContratacionPorId,
    modificarContratacion,
    eliminarContratacion
};
