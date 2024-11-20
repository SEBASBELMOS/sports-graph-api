const { driver } = require('../database/Neo4jConnection');
const neo4j = require('neo4j-driver');

const existeEquipoPorId = async (id) => {
  const session = driver.session();
  try {
    const result = await session.run(
      'MATCH (e:Equipo) WHERE id(e) = $id RETURN e',
      { id: neo4j.int(id) }
    );
    if (!result.records.length) {
      throw new Error(`El equipo con ID ${id} no existe`);
    }
  } finally {
    await session.close();
  }
};

const noExistenDeportistasPorEquipo = async (id) => {
  const session = driver.session();
  try {
    const result = await session.run(
      'MATCH (e:Equipo)<-[:JUEGA_EN]-(:Deportista) WHERE id(e) = $id RETURN COUNT(*) AS count',
      { id: neo4j.int(id) }
    );
    const count = result.records[0].get('count').toNumber();
    if (count > 0) {
      throw new Error(`No se puede eliminar el equipo con ID ${id} porque tiene deportistas asociados`);
    }
  } finally {
    await session.close();
  }
};

const noExistenContratacionesPorEquipo = async (id) => {
  const session = driver.session();
  try {
    const result = await session.run(
      'MATCH (e:Equipo)<-[:CONTRATO_CON]-(:Contrato) WHERE id(e) = $id RETURN COUNT(*) AS count',
      { id: neo4j.int(id) }
    );
    const count = result.records[0].get('count').toNumber();
    if (count > 0) {
      throw new Error(`No se puede eliminar el equipo con ID ${id} porque tiene contrataciones asociadas`);
    }
  } finally {
    await session.close();
  }
};

module.exports = {
  existeEquipoPorId,
  noExistenDeportistasPorEquipo,
  noExistenContratacionesPorEquipo
};
