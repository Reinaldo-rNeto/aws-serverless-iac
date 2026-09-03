# aws-serverless-iac

API REST *serverless* na AWS (API Gateway + Lambda + DynamoDB), provisionada inteiramente como **Infraestrutura como Código** com o [Serverless Framework](https://www.serverless.com/) — a partir do desafio "Serverless e IaC na prática" do bootcamp da [DIO](https://www.dio.me/), com base na [implementação de referência do expert](https://github.com/cassianobrexbit/dio-live-serverless-2907).

A API implementa um CRUD simples de "itens" (uma lista de tarefas): criar, listar, buscar por id, atualizar o status e remover — tudo definido em `serverless.yml`, sem nenhum recurso criado manualmente no console da AWS.

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Healthcheck simples |
| POST | `/item` | Cria um item — body: `{ "item": "texto" }` |
| GET | `/items` | Lista todos os itens |
| GET | `/items/{id}` | Busca um item pelo id |
| PUT | `/items/{id}` | Atualiza o status — body: `{ "itemStatus": true }` |
| DELETE | `/items/{id}` | Remove um item |

## Arquitetura

```
Cliente HTTP
    │
    ▼
API Gateway  ──▶  AWS Lambda (Node.js 20.x)  ──▶  DynamoDB (tabela ItemTable)
```

Todo o stack (API Gateway, as 6 funções Lambda, a tabela DynamoDB e a role do IAM com permissão apenas nas ações necessárias) é criado e gerenciado pelo CloudFormation por trás do Serverless Framework.

## Diferenças em relação à implementação de referência

A [implementação original](https://github.com/cassianobrexbit/dio-live-serverless-2907) foi feita ao vivo, com o código evoluindo passo a passo durante a live. Esta versão parte do mesmo desenho (mesmas rotas, mesma tabela) mas com alguns ajustes de robustez e boas práticas de IaC:

- **ARN da tabela obtida dinamicamente**: a versão original fixa o ARN da tabela DynamoDB com o *account ID* da conta AWS do autor original (`arn:aws:dynamodb:us-east-1:167880115321:table/ItemTable`) — ou seja, um fork não funcionava sem editar esse valor manualmente. Aqui a permissão do IAM referencia a tabela com `Fn::GetAtt: [ItemTable, Arn]`, resolvido automaticamente pelo CloudFormation para a conta onde o deploy for feito.
- **Nome da tabela via variável de ambiente**: os handlers usam `process.env.TABLE_NAME` (injetado a partir de `!Ref ItemTable`) em vez do nome fixo `"ItemTable"` espalhado em cada arquivo.
- **AWS SDK v3**: a versão original usa o `aws-sdk` v2, que está em fim de suporte. Aqui os handlers usam `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` (v3), o caminho recomendado atualmente pela AWS.
- **Runtime atualizado**: `nodejs20.x` no lugar do `nodejs14.x` (já sem suporte da AWS).
- **Validação de entrada e códigos HTTP corretos**: a versão original não valida o corpo da requisição e sempre retorna 200. Aqui: `400` para corpo inválido/campo faltando, `404` quando o item não existe, `201` ao criar, `500` só em erro real de infraestrutura.
- **CORS liberado** em todas as respostas, para a API poder ser chamada direto de um front-end no navegador.
- **Endpoint `DELETE /items/{id}`**: a versão original não tinha remoção de item; o CRUD agora está completo.
- **Testável sem AWS**: com o [dynalite](https://github.com/mhart/dynalite) (emulador do DynamoDB em memória, Node puro), `npm test` roda o fluxo completo do CRUD contra os handlers reais — sem precisar de conta AWS, Docker ou Java.

## Rodando localmente (sem custo, sem conta AWS)

```bash
npm install
npm test
```

O `npm test` sobe uma tabela DynamoDB em memória (via `dynalite`) e executa os handlers reais (criar, listar, buscar, atualizar, remover, casos de erro) — é a forma mais rápida de validar que tudo funciona.

Para simular a API HTTP completa localmente (API Gateway + Lambda + DynamoDB local), usando o [Serverless Offline](https://github.com/dherault/serverless-offline) e o [serverless-dynamodb](https://github.com/raisenational/serverless-dynamodb) (requer Java, para rodar o DynamoDB Local):

```bash
npm run offline
```

A API sobe em `http://localhost:3000`. Exemplo de uso:

```bash
curl -X POST http://localhost:3000/item -H "Content-Type: application/json" -d '{"item":"Comprar café"}'
curl http://localhost:3000/items
```

## Publicando na AWS de verdade

1. Ter uma conta AWS e o [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html) instalado.
2. Criar um usuário no IAM com permissão programática e configurar as credenciais:

   ```bash
   aws configure
   ```

3. Instalar o Serverless Framework e as dependências do projeto:

   ```bash
   npm install -g serverless@3
   npm install
   ```

4. Fazer o deploy:

   ```bash
   npx serverless deploy -v
   ```

   Ao final, o Serverless Framework imprime as URLs reais de cada endpoint.

5. Para remover tudo da AWS (evitar cobranças):

   ```bash
   npx serverless remove
   ```

## Estrutura do projeto

```
serverless.yml         # definição da infraestrutura (API Gateway, Lambda, DynamoDB, IAM)
src/
  hello.js             # GET /
  insertItem.js        # POST /item
  fetchItems.js        # GET /items
  fetchItem.js         # GET /items/{id}
  updateItem.js        # PUT /items/{id}
  deleteItem.js        # DELETE /items/{id}
  utils/
    dynamoClient.js     # client do DynamoDB (real ou local, via IS_OFFLINE)
    response.js          # helper de resposta HTTP padronizada com CORS
test/
  api.test.js          # testes de integração do CRUD, usando dynalite
```

## Sobre o projeto

Desafio de projeto do módulo de Cloud/AWS da [DIO](https://www.dio.me/) ("Primeiros passos na nuvem AWS com Serverless Framework"), a partir da [implementação de referência do expert](https://github.com/cassianobrexbit/dio-live-serverless-2907).

## Licença

Distribuído sob a licença MIT — veja [LICENSE](LICENSE).
