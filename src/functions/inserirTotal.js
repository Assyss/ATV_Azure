const { app, output } = require('@azure/functions');

const sqlOutput = output.sql({
    commandText: 'dbo.RECIBO',
    connectionStringSetting: 'SqlConnectionString'
});

app.storageQueue('inserirTotal', {
    queueName: 'fila-totais',
    connection: 'AzureWebJobsStorage',
    extraOutputs: [sqlOutput],
    handler: async (message, context) => {
        context.log(`Mensagem recebida da fila: ${message}`);

        const total = String(message);

        context.extraOutputs.set(sqlOutput, [{ TOTAL: total }]);

        context.log(`Total "${total}" enviado para inserção no banco.`);
    }
});
