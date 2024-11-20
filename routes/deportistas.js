const { Router } = require('express');
const { check } = require('express-validator');
const {
    obtenerDeportistas,
    obtenerDeportista,
    adicionarDeportista,
    modificarDeportista,
    eliminarDeportista
} = require('../controllers/deportistas');

const { validarCampos } = require('../middlewares/validar-campos');
const { existeDeportistaPorId, noExistenContratacionesPorDeportista } = require('../middlewares/validarDeportista');

const router = Router();

router.get('/', obtenerDeportistas);

router.get('/:id', [
    check('id', 'No es un ID válido').isInt(),
    check('id').custom(existeDeportistaPorId),
    validarCampos
], obtenerDeportista);

router.post('/', [
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    check('pais', 'El país es obligatorio').not().isEmpty(),
    check('posicion', 'La posición es obligatoria').not().isEmpty(),
    check('numero', 'El número es obligatorio y debe ser un número').isNumeric(),
    check('sexo', 'El sexo es obligatorio y debe ser Masculino, Femenino u Otro').isIn(['Masculino', 'Femenino', 'Otro']),
    check('equipoId', 'El ID del equipo es obligatorio y debe ser un número entero').isInt(),
    validarCampos
], adicionarDeportista);

router.put('/:id', [
    check('id', 'No es un ID válido').isInt(),
    check('id').custom(existeDeportistaPorId),
    check('sexo', 'El sexo debe ser Masculino, Femenino u Otro').optional().isIn(['Masculino', 'Femenino', 'Otro']),
    validarCampos
], modificarDeportista);

router.delete('/:id', [
    check('id', 'No es un ID válido').isInt(),
    check('id').custom(existeDeportistaPorId),
    check('id').custom(noExistenContratacionesPorDeportista),
    validarCampos
], eliminarDeportista);

module.exports = router;
