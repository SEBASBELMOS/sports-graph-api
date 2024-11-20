const { Router } = require('express');
const { check } = require('express-validator');
const {
    crearContratacion,
    obtenerContrataciones,
    obtenerContratacionPorId,
    modificarContratacion,
    eliminarContratacion
} = require('../controllers/contrataciones');
const { validarCampos } = require('../middlewares/validar-campos');
const { existeContratacionPorId } = require('../middlewares/validarContratacion');

const router = Router();

router.post('/', [
    check('deportistaId', 'El ID del deportista es obligatorio y debe ser un número entero').isInt(),
    check('equipoId', 'El ID del equipo es obligatorio y debe ser un número entero').isInt(),
    check('fecha_inicio', 'La fecha de inicio es obligatoria y debe tener formato YYYY-MM-DD').isISO8601(),
    check('fecha_fin', 'La fecha de fin es obligatoria y debe tener formato YYYY-MM-DD').isISO8601(),
    check('valor_contrato', 'El valor del contrato es obligatorio y debe ser un número').isNumeric(),
    validarCampos
], crearContratacion);

router.get('/', obtenerContrataciones);

router.get('/:id', [
    check('id', 'No es un ID válido').isInt(),
    check('id').custom(existeContratacionPorId),
    validarCampos
], obtenerContratacionPorId);

router.put('/:id', [
    check('id', 'No es un ID válido').isInt(),
    check('id').custom(existeContratacionPorId),
    validarCampos
], modificarContratacion);

router.delete('/:id', [
    check('id', 'No es un ID válido').isInt(),
    check('id').custom(existeContratacionPorId),
    validarCampos
], eliminarContratacion);

module.exports = router;
