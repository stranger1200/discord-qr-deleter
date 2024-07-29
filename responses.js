// responses.js

const responses = [
    `<@{id}> got busted! QR Code's aren't permitted in this server.`,
    `<@{id}> thought they could bust the bot! QR Code's aren't permitted in this server.`,
    `<@{id}> I'm the fastest QR code busting bot and I just busted yours! `,
];

// Function to get a random element from an array
function rand(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Export the arrays and functions
module.exports = {
    responses,
    rand
};