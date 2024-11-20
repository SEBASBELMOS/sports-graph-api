const { driver } = require('../database/Neo4jConnection');
const neo4j = require('neo4j-driver');

const existeContratacionPorId = async (id) => {
  const session = driver.session();
  try {
    const result = await session.run(
      'MATCH (c:Contrato) WHERE id(c) = $id RETURN c',
      { id: neo4j.int(id) }
    );
    if (!result.records.length) {
      throw new Error(`La contratación con ID ${id} no existe`);
    }
  } finally {
    await session.close();
  }
};

module.exports = {
  existeContratacionPorId
};
