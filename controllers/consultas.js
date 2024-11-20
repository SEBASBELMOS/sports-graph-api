const { response } = require('express');
const { driver } = require('../database/Neo4jConnection');
const neo4j = require('neo4j-driver');


const contratosRecientes = async (req, res = response) => {
    const session = driver.session();
    try {
        const { fechaInicio } = req.query;
        const fecha = fechaInicio || '2020-01-01';

        const result = await session.run(
            `
            MATCH (d:Deportista)-[:TIENE_CONTRATO]->(c:Contrato)-[:CONTRATO_CON]->(e:Equipo)
            WHERE c.fecha_inicio >= date($fecha)
            RETURN d, e, c, duration.between(c.fecha_inicio, c.fecha_fin) AS duracion_contrato
            ORDER BY c.fecha_inicio DESC
            `,
            { fecha }
        );

        const datos = result.records.map(record => ({
            deportista: record.get('d').properties,
            equipo: record.get('e').properties,
            contrato: {
                fecha_inicio: record.get('c').properties.fecha_inicio,
                fecha_fin: record.get('c').properties.fecha_fin,
                valor_contrato: neo4j.integer.toNumber(record.get('c').properties.valor_contrato),
                duracion_contrato: record.get('duracion_contrato').toString()
            }
        }));

        res.json({ total: datos.length, datos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener los contratos recientes' });
    } finally {
        await session.close();
    }
};


const deportistasFiltrados = async (req, res = response) => {
    const session = driver.session();
    try {
        const { sexo, paisDeportista, paisEquipo, deporte } = req.query;

        let query = `
            MATCH (d:Deportista)-[:JUEGA_EN]->(e:Equipo)
            OPTIONAL MATCH (e)-[:PRACTICA_DEPORTE]->(dep:Deporte)
            WHERE 1=1
        `;

        let params = {};

        if (sexo) {
            query += ' AND d.sexo = $sexo';
            params.sexo = sexo;
        }

        if (paisDeportista) {
            query += ' AND d.pais = $paisDeportista';
            params.paisDeportista = paisDeportista;
        }

        if (paisEquipo) {
            query += ' AND e.pais = $paisEquipo';
            params.paisEquipo = paisEquipo;
        }

        if (deporte) {
            query += ' AND dep.nombre = $deporte';
            params.deporte = deporte;
        }

        query += ' RETURN d, e, dep';

        const result = await session.run(query, params);

        const datos = result.records.map(record => ({
            deportista: record.get('d').properties,
            equipo: record.get('e').properties,
            deporte: record.get('dep') ? record.get('dep').properties : null
        }));

        res.json({ total: datos.length, datos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener los deportistas filtrados' });
    } finally {
        await session.close();
    }
};


const deportistasContratosMillonarios = async (req, res = response) => {
    const session = driver.session();
    try {
        const { valorContratoMinimo } = req.query;
        const valorMinimo = valorContratoMinimo ? parseInt(valorContratoMinimo) : 1000000;

        const result = await session.run(
            `
            MATCH (d:Deportista)-[:TIENE_CONTRATO]->(c:Contrato)
            WHERE c.valor_contrato > $valorMinimo
            RETURN d, c
            ORDER BY c.valor_contrato DESC
            `,
            { valorMinimo }
        );

        const datos = result.records.map(record => ({
            deportista: record.get('d').properties,
            valor_contrato: neo4j.integer.toNumber(record.get('c').properties.valor_contrato)
        }));

        res.json({ total: datos.length, datos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener los deportistas con contratos millonarios' });
    } finally {
        await session.close();
    }
};


const cantidadDeportistasPorEquipo = async (req, res = response) => {
    const session = driver.session();
    try {
        const result = await session.run(
            `
            MATCH (e:Equipo)<-[:JUEGA_EN]-(d:Deportista)
            RETURN e.nombre_equipo AS equipo, COUNT(d) AS cantidad_deportistas
            ORDER BY cantidad_deportistas DESC
            `
        );

        const datos = result.records.map(record => ({
            equipo: record.get('equipo'),
            cantidad_deportistas: neo4j.integer.toNumber(record.get('cantidad_deportistas'))
        }));

        res.json({ total: datos.length, datos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener la cantidad de deportistas por equipo' });
    } finally {
        await session.close();
    }
};


const deportistasPorFechaNacimiento = async (req, res = response) => {
    const session = driver.session();
    try {
        const result = await session.run(
            `
            MATCH (d:Deportista)-[n:NACE_EN]->(c:Ciudad)
            RETURN d, c, n.fecha_nacimiento AS fecha_nacimiento
            ORDER BY fecha_nacimiento
            `
        );

        const datos = result.records.map(record => ({
            deportista: record.get('d').properties,
            ciudad_nacimiento: record.get('c').properties,
            fecha_nacimiento: record.get('fecha_nacimiento')
        }));

        res.json({ total: datos.length, datos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener los deportistas por fecha de nacimiento' });
    } finally {
        await session.close();
    }
};


const equiposMultinacionales = async (req, res = response) => {
    const session = driver.session();
    try {
        const result = await session.run(
            `
            MATCH (e:Equipo)<-[:JUEGA_EN]-(d:Deportista)
            WITH e, COLLECT(DISTINCT d.pais) AS paises
            WHERE SIZE(paises) > 1
            RETURN e, paises
            `
        );

        const datos = result.records.map(record => ({
            equipo: record.get('e').properties,
            paises: record.get('paises')
        }));

        res.json({ total: datos.length, datos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener equipos multinacionales' });
    } finally {
        await session.close();
    }
};


const deportistasSinContrato = async (req, res = response) => {
    const session = driver.session();
    try {
        const result = await session.run(
            `
            MATCH (d:Deportista)
            WHERE NOT (d)-[:TIENE_CONTRATO]->(:Contrato)
            RETURN d
            `
        );

        const datos = result.records.map(record => ({
            deportista: record.get('d').properties
        }));

        res.json({ total: datos.length, datos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener deportistas sin contrato' });
    } finally {
        await session.close();
    }
};


const valorContratosPorEquipo = async (req, res = response) => {
    const session = driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e:Equipo)<-[:CONTRATO_CON]-(c:Contrato)<-[:TIENE_CONTRATO]-(d:Deportista)
        RETURN e.nombre_equipo AS equipo, SUM(c.valor_contrato) AS valor_total_contratos
        ORDER BY valor_total_contratos DESC
        `
      );
  
      const datos = result.records.map(record => ({
        equipo: record.get('equipo'),
        valor_total_contratos: neo4j.integer.toNumber(record.get('valor_total_contratos'))
      }));
  
      res.json({ total: datos.length, datos });
    } catch (error) {
      console.error(error);
      res.status(500).json({ msg: 'Error al obtener el valor total de contratos por equipo' });
    } finally {
      await session.close();
    }
  };
  
  const deportistasContratosSuperioresAlPromedio = async (req, res = response) => {
    const session = driver.session();
    try {
        const result = await session.run(
            `
            MATCH (d:Deportista)-[:TIENE_CONTRATO]->(c:Contrato)
            WITH avg(c.valor_contrato) AS promedio_contratos
            MATCH (d)-[:TIENE_CONTRATO]->(c:Contrato)
            WHERE c.valor_contrato > promedio_contratos
            RETURN d.nombre AS deportista, c.valor_contrato AS valor_contrato, promedio_contratos
            ORDER BY c.valor_contrato DESC
            `
        );

        const datos = result.records.map(record => ({
            deportista: record.get('deportista'),
            valor_contrato: neo4j.integer.toNumber(record.get('valor_contrato')),
            promedio_contratos: neo4j.integer.toNumber(record.get('promedio_contratos'))
        }));

        res.json({ total: datos.length, datos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener deportistas con contratos superiores al promedio' });
    } finally {
        await session.close();
    }
};
  

module.exports = {
    contratosRecientes,
    deportistasFiltrados,
    deportistasContratosMillonarios,
    cantidadDeportistasPorEquipo,
    deportistasPorFechaNacimiento,
    equiposMultinacionales,
    deportistasSinContrato,
    valorContratosPorEquipo,
    deportistasContratosSuperioresAlPromedio
};
