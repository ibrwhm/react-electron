const { Api } = require("telegram");
const { wait, shuffleArray } = require("./helpers");
const SessionManager = require("./SessionManager");

class InviteManager {
  constructor() {
    this.loggedInSessions = [];
    this.inviteSystem = {
      isActive: false,
      progress: {
        success: 0,
        fail: 0,
      },
      members: [],
      limit: 1,
      targetGroup: null,
      message: "",
    };
  }

  resetProgress() {
    this.inviteSystem.progress = {
      success: 0,
      fail: 0,
    };
    this.inviteSystem.members = [];
    this.inviteSystem.isActive = false;
    this.inviteSystem.message = "";
  }

  playNotificationSound() {
    if (global.mainWindow) {
      global.mainWindow.webContents.send("play-notification");
    }
  }

  async loginWithSessions() {
    try {
      const result = await SessionManager.loginWithSessions();

      if (result.success) {
        this.loggedInSessions = SessionManager.getLoggedInSessions();
      }

      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async fetchMembers(sourceGroup, targetGroup, method = "all") {
    try {
      if (!this.loggedInSessions || this.loggedInSessions.length === 0) {
        throw new Error("Aktif session bulunamadı! Önce giriş yapmalısınız.");
      }

      await this.loginWithSessions();

      const session = this.loggedInSessions[0];
      let members = [];

      try {
        const sourceParticipants = await session.client.getParticipants(
          sourceGroup
        );
        const existingUsernames = new Set(
          sourceParticipants
            ?.filter((user) => user?.username)
            ?.map((user) => user.username.toLowerCase())
        );

        const targetEntity = await session.client.getEntity(targetGroup);
        switch (method.toLowerCase()) {
          case "all":
            try {
              const participants = await session.client.getParticipants(
                targetEntity
              );
              members = participants
                .filter((p) => this.shouldAddUser(p, existingUsernames))
                .map((p) => ({
                  id: p.id,
                  username: p.username,
                  firstName: p.firstName,
                  lastName: p.lastName,
                  status: this.getUserStatus(p),
                }));
            } catch (error) {
              if (error.errorMessage === "CHAT_ADMIN_REQUIRED") {
                throw new Error(
                  "Bu gruptan üye çekmek için admin yetkisi gerekiyor."
                );
              }
              throw error;
            }
            break;

          case "online":
          case "recent":
            try {
              const filter =
                method === "online"
                  ? Api.ChannelParticipantsRecent()
                  : Api.ChannelParticipantsRecent();

              const participants = await session.client.getParticipants(
                targetEntity,
                { filter }
              );
              members = participants
                .filter((p) => {
                  if (this.shouldAddUser(p, existingUsernames)) {
                    return false;
                  }
                  return method === "online"
                    ? p.status && p.status.className === "UserStatusOnline"
                    : true;
                })
                .map((p) => ({
                  id: p.id,
                  username: p.username,
                  firstName: p.firstName,
                  lastName: p.lastName,
                  status: this.getUserStatus(p),
                }));
            } catch (error) {
              if (error.errorMessage === "CHAT_ADMIN_REQUIRED") {
                throw new Error(
                  "Bu gruptan üye çekmek için admin yetkisi gerekiyor."
                );
              }
              throw error;
            }
            break;

          case "active_chat":
            const uniqueUsers = new Map();
            const userMessages = new Map();
            let totalMessages = 0;
            const maxMessages = 5000;
            const pageSize = 200;

            try {
              let initialMessages;
              while (!initialMessages) {
                try {
                  initialMessages = await session.client.getMessages(
                    targetGroup,
                    { limit: 1 }
                  );
                } catch (error) {
                  throw error;
                }
              }

              if (!initialMessages || initialMessages.length === 0) {
                break;
              }

              const latestMessageId = initialMessages[0].id;
              let messages = [];

              while (totalMessages < maxMessages) {
                const currentMaxId =
                  totalMessages === 0
                    ? latestMessageId + 1
                    : messages[messages.length - 1].id;

                try {
                  messages = await session.client.getMessages(targetGroup, {
                    limit: pageSize,
                    maxId: currentMaxId,
                  });
                } catch (error) {
                  throw error;
                }

                if (!messages || messages.length === 0) {
                  break;
                }

                totalMessages += messages.length;

                messages.forEach((msg) => {
                  try {
                    if (!msg.fromId) return;

                    let userId;
                    if (typeof msg.fromId === "object") {
                      userId =
                        msg.fromId.userId?.toString() ||
                        msg.fromId.channelId?.toString();
                    } else {
                      userId = msg.fromId.toString();
                    }

                    if (!userId) return;

                    if (!userMessages.has(userId)) {
                      userMessages.set(userId, []);
                    }
                    userMessages.get(userId).push(msg);
                  } catch (msgError) {
                    throw msgError;
                  }
                });

                await wait(2000);
              }

              for (const [userId, msgs] of userMessages.entries()) {
                const dates = msgs.map((msg) => msg.date);
                uniqueUsers.set(userId, {
                  messageCount: msgs.length,
                  firstMessageDate: Math.min(...dates),
                  lastMessageDate: Math.max(...dates),
                });
              }

              const activeUsers = Array.from(uniqueUsers.entries())
                .filter(([userId, data]) => {
                  const hasEnoughMessages = data.messageCount >= 1;
                  return hasEnoughMessages;
                })
                .sort(
                  ([id1, data1], [id2, data2]) =>
                    data2.messageCount - data1.messageCount
                );
              for (const [userId, userData] of activeUsers) {
                try {
                  const user = await session.client.getEntity(userId);

                  const shouldAdd = this.shouldAddUser(user, existingUsernames);
                  if (shouldAdd) {
                    members.push({
                      id: user.id,
                      username: user.username,
                      firstName: user.firstName,
                      lastName: user.lastName,
                      messageCount: userData.messageCount,
                      firstMessageDate: userData.firstMessageDate,
                      lastMessageDate: userData.lastMessageDate,
                      status: this.getUserStatus(user),
                    });
                  }
                } catch (error) {
                  throw error;
                }

                await new Promise((resolve) => setTimeout(resolve, 500));
              }
            } catch (chatError) {
              throw chatError;
            }
            break;

          default:
            throw new Error("Geçersiz metod");
        }

        return {
          success: true,
          members: members,
          message: `${members.length} üye başarıyla getirildi`,
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  shouldAddUser(user, existingUsernames) {
    if (!user || !user.username) return false;

    const username = user.username.toLowerCase();
    if (existingUsernames.has(username)) return false;

    if (
      user.bot ||
      user.deleted ||
      user.scam ||
      user.fake ||
      user.participant?.adminRights
    )
      return false;

    return true;
  }

  getUserStatus(user) {
    if (!user) return "Bilinmiyor";

    if (user.status?.wasOnline) {
      const lastSeen = new Date(user.status.wasOnline * 1000);
      const now = new Date();
      const diff = now - lastSeen;

      if (diff < 60000) return "Az önce";
      if (diff < 3600000) return `${Math.floor(diff / 60000)} dakika önce`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat önce`;
      if (diff < 604800000) return `${Math.floor(diff / 86400000)} gün önce`;
      return lastSeen.toLocaleDateString();
    }

    if (user.status?.className === "UserStatusOnline") return "Çevrimiçi";
    if (user.status?.className === "UserStatusOffline") return "Çevrimdışı";
    if (user.status?.className === "UserStatusRecently")
      return "Son zamanlarda";
    if (user.status?.className === "UserStatusLastWeek") return "Geçen hafta";
    if (user.status?.className === "UserStatusLastMonth") return "Geçen ay";

    return "Bilinmiyor";
  }

  async inviteUsers(targetGroup, members, limit) {
    if (!members || !Array.isArray(members) || members.length === 0) {
      throw new Error("Üye listesi boş veya geçersiz");
    }

    if (!targetGroup) {
      throw new Error("Hedef grup belirtilmedi");
    }

    if (!limit || limit <= 0) {
      throw new Error("Geçersiz davet limiti");
    }

    try {
      this.inviteSystem = {
        targetGroup,
        members: shuffleArray([...members]),
        limit,
        isActive: true,
        progress: {
          success: 0,
          fail: 0,
        },
        message: "",
      };

      this.startInviteProcess();
      return { success: true, message: "Davet işlemi başlatıldı" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async startInviteProcess() {
    if (!this.inviteSystem.isActive) {
      return;
    }

    const { targetGroup, limit } = this.inviteSystem;

    if (!targetGroup) {
      throw new Error("Hedef grup belirtilmedi");
    }

    const sessionCount = this.loggedInSessions.length;
    if (sessionCount === 0) {
      throw new Error("Aktif session bulunamadı");
    }

    const sessionLimits = new Map();
    this.loggedInSessions.forEach((session) => {
      sessionLimits.set(session.phoneNumber, 0);
    });

    let sessionIndex = 0;

    const updateProgress = (finished = false, message = "") => {
      if (!global.mainWindow) return;

      this.inviteSystem.message = message;

      const progressData = {
        success: this.inviteSystem.progress.success,
        fail: this.inviteSystem.progress.fail,
        finished,
        message,
      };

      global.mainWindow.webContents.send("invite-progress", progressData);

      if (message) {
        this.playNotificationSound();
      }
    };

    await wait(5000);
    updateProgress(false, "Davet işlemi başlatılıyor...");

    while (this.inviteSystem.members.length > 0 && this.inviteSystem.isActive) {
      const currentSession = this.loggedInSessions[sessionIndex];
      const currentLimit = sessionLimits.get(currentSession.phoneNumber);

      if (currentLimit >= limit) {
        sessionIndex = (sessionIndex + 1) % sessionCount;
        const allLimitsReached = Array.from(sessionLimits.values()).every(
          (limit) => limit >= this.inviteSystem.limit
        );

        if (allLimitsReached) {
          const message = `Tüm sessionların limiti doldu. Toplam ${this.inviteSystem.progress.success} başarılı davet yapıldı.`;
          updateProgress(true, message);
          await wait(2000);
          this.inviteSystem.isActive = false;
          this.resetProgress();
          return;
        }
        continue;
      }

      const user = this.inviteSystem.members.shift();
      if (!user || !user.username) {
        this.inviteSystem.progress.fail++;
        continue;
      }

      try {
        const entity = await currentSession.client.getEntity(targetGroup);
        await currentSession.client.invoke(
          new Api.channels.InviteToChannel({
            channel: entity,
            users: [user.username || user.id.toString()],
          })
        );

        sessionLimits.set(currentSession.phoneNumber, currentLimit + 1);
        this.inviteSystem.progress.success++;
        updateProgress(false, `@${user.username} başarıyla davet edildi`);

        await wait(30000);
      } catch (error) {
        this.inviteSystem.progress.fail++;
        let errorMessage = "";

        switch (error.errorMessage) {
          case "USER_PRIVACY_RESTRICTED":
            errorMessage = `@${user.username} gizlilik ayarları nedeniyle davet edilemedi`;
            break;
          case "USER_NOT_MUTUAL_CONTACT":
            errorMessage = `@${user.username} karşılıklı iletişim olmadığı için davet edilemedi`;
            break;
          case "PEER_FLOOD":
            errorMessage = `Spam koruması nedeniyle @${user.username} davet edilemedi. 2 dakika bekleniyor...`;
            sessionLimits.set(currentSession.phoneNumber, -1);
            sessionIndex = (sessionIndex + 1) % sessionCount;

            let nextSession = this.loggedInSessions[sessionIndex];
            let attempts = 0;

            while (
              sessionLimits.get(nextSession.phoneNumber) === -1 &&
              attempts < sessionCount
            ) {
              sessionIndex = (sessionIndex + 1) % sessionCount;
              nextSession = this.loggedInSessions[sessionIndex];
              attempts++;
            }

            const allSessionsFlooded = Array.from(sessionLimits.values()).every(
              (limit) => limit === -1
            );

            if (allSessionsFlooded) {
              const message =
                "Tüm sessionlar spam korumasında. İşlem durduruluyor...";
              updateProgress(true, message);
              this.inviteSystem.isActive = false;
              this.resetProgress();
              return;
            }

            if (sessionLimits.get(nextSession.phoneNumber) === -1) {
              this.inviteSystem.members.unshift(user);
            }

            await wait(120000);
            break;
          default:
            errorMessage = `@${user.username} davet edilemedi: ${error.errorMessage}`;
        }

        await wait(10000);
      }

      sessionIndex = (sessionIndex + 1) % sessionCount;
    }

    if (this.inviteSystem.isActive) {
      const message = `Davet işlemi tamamlandı. Toplam ${this.inviteSystem.progress.success} başarılı davet yapıldı.`;
      updateProgress(true, message);
      await wait(2000);
      this.inviteSystem.isActive = false;
      this.resetProgress();
    }
  }

  stopInviteSystem() {
    if (this.inviteSystem.isActive) {
      const message = `Davet işlemi durduruldu. Toplam ${this.inviteSystem.progress.success} başarılı davet yapıldı.`;

      if (global.mainWindow) {
        global.mainWindow.webContents.send("invite-progress", {
          success: this.inviteSystem.progress.success,
          fail: this.inviteSystem.progress.fail,
          finished: true,
          message,
        });
        this.playNotificationSound();

        setTimeout(() => {
          this.inviteSystem.isActive = false;
          this.resetProgress();
        }, 2000);
      }
    }
  }
}

const inviteManager = new InviteManager();
module.exports = inviteManager;
