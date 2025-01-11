const API_CREDENTIALS = [
  { apiId: 27938477, apiHash: "795e049a50c2e0b9ab8cd1f5f72468c2" },
  { apiId: 24903020, apiHash: "78cac84240ec39e6dcd6e7f32d39b786" },
  { apiId: 28621526, apiHash: "fbdc2b3f6c0eed2889b518ddbef8d133" },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const emojis = ["👍", "❤️", "🔥", "👏", "😁", "🎉", "🤩", "💯"];

const getRandomEmoji = () => {
  return emojis[Math.floor(Math.random() * emojis.length)];
};

function getRandomApiCredentials() {
  const randomIndex = Math.floor(Math.random() * API_CREDENTIALS.length);
  return API_CREDENTIALS[randomIndex];
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports = {
  getRandomApiCredentials,
  wait,
  shuffleArray,
  getRandomEmoji,
  emojis,
};
