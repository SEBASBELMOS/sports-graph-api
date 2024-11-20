const { Router } = require('express');
const { check } = require('express-validator');
const {
  obtenerEquiposGet,
  obtenerEquipoGet,
  crearEquipoPost,
  actualizarEquipoPut,
  borrarEquipoDelete
} = require('../controllers/equipos');
const {
  existeEquipoPorId,
  noExistenDeportistasPorEquipo,
  noExistenContratacionesPorEquipo
} = require('../middlewares/validarEquipo');
const { validarCampos } = require('../middlewares/validar-campos');

const router = Router();

router.get('/', obtenerEquiposGet);

router.get('/:id', [
  check('id', 'No es un ID válido').isInt(),
  check('id').custom(existeEquipoPorId),
  validarCampos
], obtenerEquipoGet);

router.post('/', [
  check('nombre_equipo', 'El nombre del equipo es obligatorio').not().isEmpty(),
  check('pais', 'El país es obligatorio').not().isEmpty(),
  check('deporteNombre', 'El nombre del deporte es obligatorio').not().isEmpty(),
  validarCampos
], crearEquipoPost);

router.put('/:id', [
  check('id', 'No es un ID válido').isInt(),
  check('id').custom(existeEquipoPorId),
  validarCampos
], actualizarEquipoPut);

router.delete('/:id', [
  check('id', 'No es un ID válido').isInt(),
  check('id').custom(existeEquipoPorId),
  check('id').custom(noExistenDeportistasPorEquipo),
  check('id').custom(noExistenContratacionesPorEquipo),
  validarCampos,
], borrarEquipoDelete);

module.exports = router;
