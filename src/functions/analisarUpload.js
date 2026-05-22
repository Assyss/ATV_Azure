const { app, output } = require('@azure/functions');
const multipart = require('parse-multipart-data');
const axios = require('axios');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const queueOutput = output.storageQueue({
    queueName: 'fila-totais',
    connection: 'AzureWebJobsStorage'
});

app.http('analisarUpload', {
    methods: ['POST'],
    authLevel: 'anonymous',
    extraOutputs: [queueOutput],
    handler: async (request, context) => {

        try {
            const CHAVE_API_KEY = process.env.DOCUMENT_INTELLIGENCE_API_KEY;
            let endpoint = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT || 'https://brazilsouth.api.cognitive.microsoft.com/';
            if (!endpoint.endsWith('/')) {
                endpoint += '/';
            }
            if (!CHAVE_API_KEY) {
                return {
                    status: 500,
                    jsonBody: { erro: 'Defina DOCUMENT_INTELLIGENCE_API_KEY nas Application Settings (ou em local.settings.json).' }
                };
            }

            const bodyBuffer = Buffer.from(await request.arrayBuffer());

            const contentType = request.headers.get('content-type');
            const boundary = contentType.split('boundary=')[1];

            const parts = multipart.parse(bodyBuffer, boundary);

            if (!parts.length) {
                return {
                    status: 400,
                    jsonBody: { erro: "Nenhum arquivo enviado." }
                };
            }

            const arquivo = parts[0];

            context.log('Enviando para processamento');
            const response = await axios.post(
                `${endpoint}documentintelligence/documentModels/prebuilt-receipt:analyze?api-version=2024-11-30`,
                arquivo.data,
                {
                    headers: {
                        'Ocp-Apim-Subscription-Key': CHAVE_API_KEY,
                        'Content-Type': 'application/octet-stream'
                    }
                }
            );

            context.log(`Imagem em processamento: ${response.headers['operation-location']}`);
            context.log('Obtendo o resultado');

            let analise = await axios.get(
                response.headers['operation-location'],
                {
                    headers: { 'Ocp-Apim-Subscription-Key': CHAVE_API_KEY }
                }
            );

            while (analise.data.status === 'running') {
                await sleep(5000);
                analise = await axios.get(
                    response.headers['operation-location'],
                    {
                        headers: { 'Ocp-Apim-Subscription-Key': CHAVE_API_KEY }
                    }
                );
                context.log(analise.data.status);
            }

            const documento = analise.data.analyzeResult.documents[0];
            context.log(documento);

            const totalField = documento.fields.Total;
            const totalValue = totalField
                ? (totalField.content || String(totalField.valueNumber) || "0")
                : "0";

            context.log(`Total extraído: ${totalValue}`);

            context.extraOutputs.set(queueOutput, totalValue);

            return {
                status: 200,
                jsonBody: {
                    resultado: documento.fields,
                    totalEnviado: totalValue
                }
            };

        } catch (err) {
            context.log(`Erro: ${err.message}`);
            return {
                status: 500,
                jsonBody: { erro: err.message }
            };
        }
    }
});
