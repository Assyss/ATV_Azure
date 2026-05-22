const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function enviarImagem() {

    const URL = "https://app-functions-20260508210407.azurewebsites.net/api/analisarupload";
    // const URL = "http://localhost:7071/api/analisarUpload";
    const form = new FormData();

    form.append(
        'file',
        fs.createReadStream('./contoso-receipt.png')
    );

    const response = await axios.post(
        URL,
        form,
        {
            headers: form.getHeaders()
        }
    );

    return response.data.resultado;

}


const teste = async () => {

    const resposta = await enviarImagem();
    console.log(resposta);

}

teste();
