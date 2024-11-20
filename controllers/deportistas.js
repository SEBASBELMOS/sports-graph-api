const { response } = require('express');
const { driver } = require('../database/Neo4jConnection');
const neo4j = require('neo4j-driver');
const { deportistaSchema } = require('../validations/deportista');
const { v4: uuidv4 } = require('uuid');

const obtenerDeportistas = async (req, res = response) => {
    const session = driver.session();
    const { limite = 5, desde = 0 } = req.query;

    try {
        const result = await session.run(
            `
            MATCH (d:Deportista)-[:JUEGA_EN]->(e:Equipo)
            RETURN id(d) AS id, d, e
            SKIP $desde LIMIT $limite
            `,
            {
                desde: neo4j.int(desde),
                limite: neo4j.int(limite)
            }
        );

        const deportistas = result.records.map(record => ({
            id: record.get('id').toNumber(),
            deportista: record.get('d').properties,
            equipo: record.get('e').properties
        }));

        res.json({ total: deportistas.length, deportistas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener los deportistas' });
    } finally {
        await session.close();
    }
};

const obtenerDeportista = async (req, res = response) => {
    const { id } = req.params;
    const session = driver.session();

    try {
        const result = await session.run(
            `
            MATCH (d:Deportista)-[:JUEGA_EN]->(e:Equipo)
            WHERE id(d) = $id
            RETURN d, e
            `,
            { id: neo4j.int(id) }
        );

        if (!result.records.length) {
            return res.status(404).json({ msg: 'Deportista no encontrado' });
        }

        const record = result.records[0];
        const deportista = {
            id: id,
            deportista: {
                ...record.get('d').properties,
                numero: record.get('d').properties.numero.toNumber(), 
                ciudadNacimiento: record.get('d').properties.ciudadNacimiento
            },
            equipo: record.get('e').properties
        };

        res.json(deportista);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener el deportista' });
    } finally {
        await session.close();
    }
};

const adicionarDeportista = async (req, res = response) => {
    const session = driver.session();

    // Validar los datos de entrada usando el esquema de validación
    const { error } = deportistaSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ msg: error.details[0].message });
    }

    const { nombre, pais, posicion, numero, sexo, equipoId, ciudadNacimiento } = req.body;

    const id = uuidv4(); // Genera un ID único usando uuid

    try {
        // Verificar que el equipo existe
        const equipoResult = await session.run(
            'MATCH (e:Equipo) WHERE id(e) = $equipoId RETURN e',
            { equipoId: neo4j.int(equipoId) }
        );

        if (!equipoResult.records.length) {
            return res.status(400).json({ msg: 'El equipo especificado no existe' });
        }

        // Verificar si ya existe un deportista con el mismo nombre y número en el equipo
        const deportistaExistente = await session.run(
            `
            MATCH (d:Deportista)-[:JUEGA_EN]->(e:Equipo)
            WHERE id(e) = $equipoId AND d.nombre = $nombre AND d.numero = $numero
            RETURN d
            `,
            {
                equipoId: neo4j.int(equipoId),
                nombre,
                numero: neo4j.int(numero)
            }
        );

        if (deportistaExistente.records.length) {
            return res.status(400).json({
                msg: 'Ya existe un deportista con el mismo nombre y número en el equipo especificado'
            });
        }

        // Crear el deportista y relacionarlo con el equipo
        const result = await session.run(
            `
            MATCH (e:Equipo)
            WHERE id(e) = $equipoId
            CREATE (d:Deportista {
                id: $id,
                nombre: $nombre,
                ciudadNacimiento: $ciudadNacimiento,
                pais: $pais,
                posicion: $posicion,
                numero: $numero,
                sexo: $sexo
            })-[:JUEGA_EN]->(e)
            RETURN d, e
            `,
            {
                id,
                nombre,
                ciudadNacimiento,
                pais,
                posicion,
                numero: neo4j.int(numero),
                sexo,
                equipoId: neo4j.int(equipoId)
            }
        );

        const deportistaCreado = result.records[0].get('d').properties;

        res.json({
            msg: 'Deportista creado correctamente',
            deportista: deportistaCreado
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear el deportista' });
    } finally {
        await session.close();
    }
};

const modificarDeportista = async (req, res = response) => {
    const { id } = req.params;
    const { nombre, pais, posicion, numero, sexo, equipoId, ciudadNacimiento } = req.body;
    const session = driver.session();

    try {
        // Verificar si se quiere cambiar de equipo
        if (equipoId) {
            // Verificar que el equipo existe
            const equipoResult = await session.run(
                'MATCH (e:Equipo) WHERE id(e) = $equipoId RETURN e',
                { equipoId: neo4j.int(equipoId) }
            );

            if (!equipoResult.records.length) {
                return res.status(400).json({ msg: 'El equipo especificado no existe' });
            }

            // Actualizar el equipo
            await session.run(
                `
                MATCH (d:Deportista)-[r:JUEGA_EN]->(:Equipo)
                WHERE id(d) = $id
                DELETE r
                WITH d
                MATCH (eNuevo:Equipo)
                WHERE id(eNuevo) = $equipoId
                CREATE (d)-[:JUEGA_EN]->(eNuevo)
                SET d.ciudadNacimiento = $ciudadNacimiento
                `,
                {
                    id: neo4j.int(id),
                    equipoId: neo4j.int(equipoId),
                    ciudadNacimiento: ciudadNacimiento
                }
            );
        }

        // Actualizar los demás datos del deportista
        let setClause = [];
        let params = { id: neo4j.int(id) };

        if (nombre !== undefined) {
            setClause.push('d.nombre = $nombre');
            params.nombre = nombre;
        }
        if (pais !== undefined) {
            setClause.push('d.pais = $pais');
            params.pais = pais;
        }
        if (posicion !== undefined) {
            setClause.push('d.posicion = $posicion');
            params.posicion = posicion;
        }
        if (numero !== undefined) {
            setClause.push('d.numero = $numero');
            params.numero = neo4j.int(numero);
        }
        if (sexo !== undefined) {
            setClause.push('d.sexo = $sexo');
            params.sexo = sexo;
        }

        if (setClause.length > 0) {
            await session.run(
                `
                MATCH (d:Deportista)
                WHERE id(d) = $id
                SET ${setClause.join(', ')}
                RETURN d
                `,
                params
            );
        }

        res.json({ msg: 'Deportista actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al modificar el deportista' });
    } finally {
        await session.close();
    }
};

const eliminarDeportista = async (req, res = response) => {
    const { id } = req.params;
    const session = driver.session();

    try {
        await session.run(
            `
            MATCH (d:Deportista)
            WHERE id(d) = $id
            DETACH DELETE d
            `,
            { id: neo4j.int(id) }
        );

        res.json({ msg: 'Deportista eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al eliminar el deportista' });
    } finally {
        await session.close();
    }
};

module.exports = {
    obtenerDeportistas,
    obtenerDeportista,
    adicionarDeportista,
    modificarDeportista,
    eliminarDeportista
};
