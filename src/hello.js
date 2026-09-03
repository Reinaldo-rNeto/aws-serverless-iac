"use strict";

const { buildResponse } = require("./utils/response");

const hello = async (event) => {
  return buildResponse(200, {
    message: "API no ar! Veja o README para os endpoints disponíveis.",
    input: event,
  });
};

module.exports = { handler: hello };
