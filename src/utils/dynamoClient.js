"use strict";

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

// Quando rodando via `serverless-offline` + `serverless-dynamodb`
// (`npm run offline`), o plugin define IS_OFFLINE=true e sobe uma instância
// local do DynamoDB em http://localhost:8000 — assim os handlers podem ser
// testados de ponta a ponta sem precisar de uma conta AWS.
const client = new DynamoDBClient(
  process.env.IS_OFFLINE
    ? {
        region: "localhost",
        endpoint: "http://localhost:8000",
        credentials: {
          accessKeyId: "local",
          secretAccessKey: "local",
        },
      }
    : {}
);

const dynamoDb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE_NAME = process.env.TABLE_NAME || "ItemTable";

module.exports = { dynamoDb, TABLE_NAME };
