const { Api } = require("telegram");

async function getChannelUsername(client, channelId) {
  try {
    const channel = await client.invoke(
      new Api.channels.GetChannels({
        id: [
          new Api.InputChannel({
            channelId: channelId,
            accessHash: 0,
          }),
        ],
      })
    );

    return channel.chats[0]?.username || "";
  } catch (error) {
    throw new Error(`Error getting channel username: ${error.message}`);
  }
}

module.exports = {
  getChannelUsername,
};
