// src/utils/helpers/request.helpers.js
const { AsyncLocalStorage } = require("async_hooks");

const asyncLocalStorage = new AsyncLocalStorage();

function getCorrelationId() {
  const asyncStore = asyncLocalStorage.getStore();
  return (asyncStore && asyncStore.correlationId) || "Error while fetching correlation id or no request served yet";
}

module.exports = {
  asyncLocalStorage,
  getCorrelationId,
};
