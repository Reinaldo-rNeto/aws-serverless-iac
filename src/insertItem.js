"use strict";

const { v4: uuidv4 } = require("uuid");
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { dynamoDb, TABLE_NAME } = require("./utils/dynamoClient");
const { buildResponse } = require("./utils/response");

const insertItem = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (error) {
    return buildResponse(400, { message: "Corpo da requisição precisa ser um JSON válido." });
  }

  const { item } = body;
  if (!item || typeof item !== "string" || !item.trim()) {
    return buildResponse(400, { message: "O campo 'item' é obrigatório e precisa ser uma string." });
  }

  const newItem = {
    id: uuidv4(),
    item: item.trim(),
    createdAt: new Date().toISOString(),
    itemStatus: false,
  };

  try {
    await dynamoDb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: newItem,
      })
    );
  } catch (error) {
    console.error("Erro ao inserir item no DynamoDB:", error);
    return buildResponse(500, { message: "Não foi possível salvar o item." });
  }

  return buildResponse(201, newItem);
};

module.exports = { handler: insertItem };
