const Joi = require('joi');

const deportistaSchema = Joi.object({
    nombre: Joi.string().required(),
    ciudadNacimiento: Joi.string().required(), // Agregado
    pais: Joi.string().required(),
    posicion: Joi.string().required(),
    numero: Joi.number().integer().required(),
    sexo: Joi.string().valid('Masculino', 'Femenino', 'Otro').required(),
    equipoId: Joi.number().integer().required()
});

module.exports = { deportistaSchema };
