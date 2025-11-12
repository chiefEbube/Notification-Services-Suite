const { query } = require('../db');
const { successResponse, errorResponse } = require('../utils/response');
const { v4: uuidv4 } = require('uuid'); // For generating UUIDs

// Helper to apply variable substitution
const applyVariables = (content, variables) => {
    let processedContent = content;
    for (const key in variables) {
        if (Object.hasOwnProperty.call(variables, key)) {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            processedContent = processedContent.replace(placeholder, variables[key]);
        }
    }
    return processedContent;
};

// POST /templates - Create a new template
const createTemplate = async (request, reply) => {
    const { name, content, language = 'en', type } = request.body;
    const correlationId = request.id; // Assuming correlationId is available from Fastify request

    if (!name || !content || !type) {
        return reply.code(400).send(errorResponse('Validation Error', 'Missing required fields: name, content, type'));
    }

    try {
        // Check for existing template with same name, language, type, and version
        const checkQuery = `
            SELECT id, version FROM templates
            WHERE name = $1 AND language = $2 AND type = $3
            ORDER BY version DESC
            LIMIT 1;
        `;
        const checkResult = await query(checkQuery, [name, language, type]);
        let newVersion = 1;

        if (checkResult.rows.length > 0) {
            // If an existing template is found, increment its version
            newVersion = checkResult.rows[0].version + 1;
        }

        const insertQuery = `
            INSERT INTO templates (name, content, language, type, version)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, content, language, type, version, created_at, updated_at;
        `;
        const result = await query(insertQuery, [name, content, language, type, newVersion]);
        const newTemplate = result.rows[0];

        reply.code(201).send(successResponse(newTemplate, 'Template created successfully'));
    } catch (error) {
        request.log.error({ error, correlationId }, 'Error creating template');
        reply.code(500).send(errorResponse('Internal Server Error', 'Failed to create template'));
    }
};

// GET /templates/:id - Retrieve a template by its ID
const getTemplateById = async (request, reply) => {
    const { id } = request.params;
    const { variables } = request.query; // Optional variables for substitution
    const correlationId = request.id;

    try {
        const result = await query('SELECT * FROM templates WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return reply.code(404).send(errorResponse('Not Found', 'Template not found'));
        }
        let template = result.rows[0];

        if (variables) {
            try {
                const parsedVariables = JSON.parse(variables);
                template.content = applyVariables(template.content, parsedVariables);
            } catch (parseError) {
                request.log.warn({ parseError, correlationId }, 'Failed to parse variables for template substitution');
                // Continue without substitution if variables are malformed
            }
        }

        reply.code(200).send(successResponse(template, 'Template retrieved successfully'));
    } catch (error) {
        request.log.error({ error, correlationId }, 'Error retrieving template by ID');
        reply.code(500).send(errorResponse('Internal Server Error', 'Failed to retrieve template'));
    }
};

// GET /templates/search - Retrieve templates by name, language, and type
const searchTemplates = async (request, reply) => {
    const { name, language = 'en', type, variables } = request.query;
    const correlationId = request.id;

    if (!name || !type) {
        return reply.code(400).send(errorResponse('Validation Error', 'Missing required query parameters: name, type'));
    }

    try {
        // Always fetch the latest version
        const result = await query(
            'SELECT * FROM templates WHERE name = $1 AND language = $2 AND type = $3 ORDER BY version DESC LIMIT 1',
            [name, language, type]
        );

        if (result.rows.length === 0) {
            return reply.code(404).send(errorResponse('Not Found', 'Template not found for the given criteria'));
        }
        let template = result.rows[0];

        if (variables) {
            try {
                const parsedVariables = JSON.parse(variables);
                template.content = applyVariables(template.content, parsedVariables);
            } catch (parseError) {
                request.log.warn({ parseError, correlationId }, 'Failed to parse variables for template substitution');
            }
        }

        reply.code(200).send(successResponse(template, 'Template retrieved successfully'));
    } catch (error) {
        request.log.error({ error, correlationId }, 'Error searching templates');
        reply.code(500).send(errorResponse('Internal Server Error', 'Failed to search templates'));
    }
};

// PUT /templates/:id - Update a template (creates a new version)
const updateTemplate = async (request, reply) => {
    const { id } = request.params;
    const { content, language, type } = request.body; // Name cannot be changed for versioning
    const correlationId = request.id;

    if (!content) {
        return reply.code(400).send(errorResponse('Validation Error', 'Missing required field: content'));
    }

    try {
        // Fetch the existing template to get its name, language, and current version
        const existingTemplateResult = await query('SELECT name, language, type, version FROM templates WHERE id = $1', [id]);
        if (existingTemplateResult.rows.length === 0) {
            return reply.code(404).send(errorResponse('Not Found', 'Original template not found for update'));
        }
        const existingTemplate = existingTemplateResult.rows[0];

        // Determine the new version number
        const latestVersionResult = await query(
            'SELECT version FROM templates WHERE name = $1 AND language = $2 AND type = $3 ORDER BY version DESC LIMIT 1',
            [existingTemplate.name, existingTemplate.language, existingTemplate.type]
        );
        const newVersion = (latestVersionResult.rows.length > 0 ? latestVersionResult.rows[0].version : 0) + 1;

        // Insert a new version of the template
        const insertQuery = `
            INSERT INTO templates (name, content, language, type, version)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, content, language, type, version, created_at, updated_at;
        `;
        const result = await query(insertQuery, [existingTemplate.name, content, existingTemplate.language, existingTemplate.type, newVersion]);
        const updatedTemplate = result.rows[0];

        reply.code(200).send(successResponse(updatedTemplate, 'Template updated (new version created) successfully'));
    } catch (error) {
        request.log.error({ error, correlationId, templateId: id }, 'Error updating template');
        reply.code(500).send(errorResponse('Internal Server Error', 'Failed to update template'));
    }
};

// DELETE /templates/:id - Delete a template
const deleteTemplate = async (request, reply) => {
    const { id } = request.params;
    const correlationId = request.id;

    try {
        const result = await query('DELETE FROM templates WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return reply.code(404).send(errorResponse('Not Found', 'Template not found'));
        }
        reply.code(200).send(successResponse({ id }, 'Template deleted successfully'));
    } catch (error) {
        request.log.error({ error, correlationId, templateId: id }, 'Error deleting template');
        reply.code(500).send(errorResponse('Internal Server Error', 'Failed to delete template'));
    }
};

module.exports = {
    createTemplate,
    getTemplateById,
    searchTemplates,
    updateTemplate,
    deleteTemplate,
};
