const { Api } = require("telegram");

async function getChannelUsername(client, channelName) {
  try {
    let username = channelName.trim();

    if (username.includes("t.me/") || username.includes("telegram.me/")) {
      username = username.split("/").pop();
    }

    if (username.startsWith("@")) {
      username = username.substring(1);
    }

    username = username.replace(/\s+/g, "");

    if (!username) {
      throw new Error("Geçersiz kanal adı");
    }

    const result = await client.invoke(
      new Api.contacts.ResolveUsername({
        username: username,
      })
    );

    if (!result || !result.peer) {
      throw new Error("Kanal bulunamadı");
    }

    return result.peer;
  } catch (error) {
    if (error.message.includes("USERNAME_NOT_OCCUPIED")) {
      throw new Error("Bu kullanıcı adına sahip bir kanal bulunamadı");
    }
    if (error.message.includes("USERNAME_INVALID")) {
      throw new Error("Geçersiz kanal adı");
    }
    throw new Error(`Kanal bilgisi alınamadı: ${error.message}`);
  }
}

module.exports = getChannelUsername;
