const axios = require("axios");

async function Log(stack, level, package_name, message, token) {
  try {
    const response = await axios.post(
      "http://20.207.122.201/evaluation-service/logs",
      {
        stack: stack,
        level: level,
        package: package_name,
        message: message,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("Log created:", response.data);
    return response.data;
  } catch (err) {
    console.error("Logging failed:", err.message);
  }
}

module.exports = { Log };