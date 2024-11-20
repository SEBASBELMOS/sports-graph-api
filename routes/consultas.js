const { Router } = require('express');
const {
    contratosRecientes,
    deportistasFiltrados,
    deportistasContratosMillonarios,
    cantidadDeportistasPorEquipo,
    deportistasPorFechaNacimiento,
    equiposMultinacionales,
    deportistasSinContrato,
    valorContratosPorEquipo,
    deportistasContratosSuperioresAlPromedio
} = require('../controllers/consultas');

const router = Router();

router.get('/contratos-recientes', contratosRecientes);

router.get('/deportistas', deportistasFiltrados);

router.get('/deportistas-contratos-millonarios', deportistasContratosMillonarios);

router.get('/cantidad-deportistas-por-equipo', cantidadDeportistasPorEquipo);

router.get('/deportistas-por-fecha-nacimiento', deportistasPorFechaNacimiento);

router.get('/equipos-multinacionales', equiposMultinacionales);

router.get('/deportistas-sin-contrato', deportistasSinContrato);

router.get('/valor-contratos-por-equipo', valorContratosPorEquipo);

router.get('/deportistas-contratos-superiores-promedio', deportistasContratosSuperioresAlPromedio);

module.exports = router;
