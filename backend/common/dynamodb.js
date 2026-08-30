const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const TABLE_NAME = process.env.SMART_RESORT_TABLE || "SmartResortTable";

// Lambda supplies credentials and region at runtime; no credentials are stored here.
const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

module.exports = {
  TABLE_NAME,
  documentClient,
};
