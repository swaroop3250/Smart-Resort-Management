const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { documentClient, TABLE_NAME } = require("../common/dynamodb");
const { error, json } = require("../common/http");

const toRoomResponse = (room) => ({
  roomId: room.roomId,
  roomName: room.roomName,
  category: room.category,
  price: room.price,
  capacity: room.capacity,
  rating: room.rating,
  description: room.description,
  amenities: room.amenities || [],
  image: room.image,
  ...(room.tag ? { tag: room.tag } : {}),
});

const getRooms = async (_event, { client = documentClient, tableName = TABLE_NAME } = {}) => {
  try {
    const result = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "#itemType = :roomType",
        ExpressionAttributeNames: { "#itemType": "itemType" },
        ExpressionAttributeValues: { ":roomType": "ROOM" },
      })
    );

    return json(200, {
      items: (result.Items || []).map(toRoomResponse),
    });
  } catch {
    return error(500, "ROOMS_READ_FAILED", "Unable to read the room catalog.");
  }
};

exports.handler = getRooms;
exports.getRooms = getRooms;
