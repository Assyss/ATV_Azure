const { app, input } = require('@azure/functions');

const sqlInput = input.sql({
    commandText: 'SELECT Id, TOTAL FROM dbo.RECIBO',
    connectionStringSetting: 'SqlConnectionString'
});

app.http('listarTotais', {
    methods: ['GET'],
    authLevel: 'anonymous',
    extraInputs: [sqlInput],
    handler: async (request, context) => {

        context.log('Buscando totais no banco...');

        const recibos = context.extraInputs.get(sqlInput);

        context.log('Resultado:', recibos);

        return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recibos)
        };
    }
});
