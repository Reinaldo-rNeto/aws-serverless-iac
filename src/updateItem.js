"use strict";

const { UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { dynamoDb, TABLE_NAME } = require("./utils/dynamoClient");
const { buildResponse } = require("./utils/response");

const updateItem = async (event) => {
  const { id } = event.pathParameters || {};
  if (!id) {
    return buildResponse(400, { message: "O parâmetro 'id' é obrigatório." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (error) {
    return buildResponse(400, { message: "Corpo da requisição precisa ser um JSON válido." });
  }

  const { itemStatus } = body;
  if (typeof itemStatus !== "boolean") {
    return buildResponse(400, { message: "O campo 'itemStatus' é obrigatório e precisa ser um booleano." });
  }

  try {
    const existing = await dynamoDb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { id } })
    );
    if (!existing.Item) {
      return buildResponse(404, { message: `Item '${id}' não encontrado.` });
    }

    const result = await dynamoDb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: "set itemStatus = :itemStatus",
        ExpressionAttributeValues: { ":itemStatus": itemStatus },
        ReturnValues: "ALL_NEW",
      })
    );

    return buildResponse(200, result.Attributes);
  } catch (error) {
    console.error("Erro ao atualizar item no DynamoDB:", error);
    return buildResponse(500, { message: "Não foi possível atualizar o item." });
  }
};

module.exports = { handler: updateItem };
