var utils = {
  sendData: function(ws, event, data) {
    ws.send(JSON.stringify({event: event, data: data}));
  },
};

module.exports = utils;
