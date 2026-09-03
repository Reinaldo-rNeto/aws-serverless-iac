"use strict";

// Testes de integração dos handlers Lambda, rodando 100% offline: usa o
// dynalite (implementação do protocolo do DynamoDB em memória, em Node puro)
// no lugar de uma tabela real na AWS. Isso permite validar toda a lógica de
// negócio (validação de entrada, códigos de status, persistência) sem
// precisar de conta AWS, Docker ou Java — só `npm test`.

const test = require("node:test");
const assert = require("node:assert/strict");
const dynalite = require("dynalite");
const { DynamoDBClient, CreateTableCommand } = require("@aws-sdk/client-dynamodb");

process.env.IS_OFFLINE = "true";
process.env.TABLE_NAME = "ItemTable-test";

const PORT = 8000;
let dynaliteServer;

test.before(async () => {
  dynaliteServer = dynalite({ createTableMs: 0 });
  await new Promise((resolve, reject) => {
    dynaliteServer.listen(PORT, (err) => (err ? reject(err) : resolve()));
  });

  const client = new DynamoDBClient({
    region: "localhost",
    endpoint: `http://localhost:${PORT}`,
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  });

  await client.send(
    new CreateTableCommand({
      TableName: process.env.TABLE_NAME,
      AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      BillingMode: "PAY_PER_REQUEST",
    })
  );
});

test.after(async () => {
  await new Promise((resolve) => dynaliteServer.close(resolve));
});

// Os handlers só podem ser importados depois que IS_OFFLINE/TABLE_NAME estão
// definidos, pois src/utils/dynamoClient.js lê essas variáveis na primeira
// vez que o módulo é carregado.
const { handler: hello } = require("../src/hello");
const { handler: insertItem } = require("../src/insertItem");
const { handler: fetchItems } = require("../src/fetchItems");
const { handler: fetchItem } = require("../src/fetchItem");
const { handler: updateItem } = require("../src/updateItem");
const { handler: deleteItem } = require("../src/deleteItem");

test("GET / responde 200 com uma mensagem", async () => {
  const res = await hello({});
  assert.equal(res.statusCode, 200);
  assert.match(JSON.parse(res.body).message, /API no ar/);
});

test("POST /item sem o campo 'item' retorna 400", async () => {
  const res = await insertItem({ body: JSON.stringify({}) });
  assert.equal(res.statusCode, 400);
});

test("fluxo completo de CRUD: criar, listar, buscar, atualizar e remover um item", async () => {
  // Criar
  const created = await insertItem({ body: JSON.stringify({ item: "Comprar café" }) });
  assert.equal(created.statusCode, 201);
  const newItem = JSON.parse(created.body);
  assert.ok(newItem.id);
  assert.equal(newItem.item, "Comprar café");
  assert.equal(newItem.itemStatus, false);

  // Listar
  const listed = await fetchItems();
  assert.equal(listed.statusCode, 200);
  const items = JSON.parse(listed.body);
  assert.ok(items.some((i) => i.id === newItem.id));

  // Buscar por id
  const fetched = await fetchItem({ pathParameters: { id: newItem.id } });
  assert.equal(fetched.statusCode, 200);
  assert.equal(JSON.parse(fetched.body).id, newItem.id);

  // Buscar id inexistente -> 404
  const notFound = await fetchItem({ pathParameters: { id: "nao-existe" } });
  assert.equal(notFound.statusCode, 404);

  // Atualizar
  const updated = await updateItem({
    pathParameters: { id: newItem.id },
    body: JSON.stringify({ itemStatus: true }),
  });
  assert.equal(updated.statusCode, 200);
  assert.equal(JSON.parse(updated.body).itemStatus, true);

  // Atualizar id inexistente -> 404
  const updateNotFound = await updateItem({
    pathParameters: { id: "nao-existe" },
    body: JSON.stringify({ itemStatus: true }),
  });
  assert.equal(updateNotFound.statusCode, 404);

  // Remover
  const deleted = await deleteItem({ pathParameters: { id: newItem.id } });
  assert.equal(deleted.statusCode, 200);

  // Confirma que sumiu
  const afterDelete = await fetchItem({ pathParameters: { id: newItem.id } });
  assert.equal(afterDelete.statusCode, 404);

  // Remover de novo -> 404
  const deleteAgain = await deleteItem({ pathParameters: { id: newItem.id } });
  assert.equal(deleteAgain.statusCode, 404);
});
