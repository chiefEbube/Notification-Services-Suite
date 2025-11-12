const {
    createTemplate,
    getTemplateById,
    searchTemplates,
    updateTemplate,
    deleteTemplate,
} = require('../handlers/template.handler');

async function templateRoutes(fastify, options) {
    fastify.post('/', createTemplate);
    fastify.get('/:id', getTemplateById);
    fastify.get('/search', searchTemplates); // Query params: name, language, type
    fastify.put('/:id', updateTemplate);
    fastify.delete('/:id', deleteTemplate);
}

module.exports = templateRoutes;
