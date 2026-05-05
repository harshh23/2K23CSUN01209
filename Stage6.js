const axios = require("axios");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJoYXJzaGdpbGwwNzZAZ21haWwuY29tIiwiZXhwIjoxNzc3OTcyOTUwLCJpYXQiOjE3Nzc5NzIwNTAsImlzcyI6IkFmZm9yZCBNZWRpY2FsIFRlY2hub2xvZ2llcyBQcml2YXRlIExpbWl0ZWQiLCJqdGkiOiJiZjhlNzQzZi0wYTQxLTRhYmItOWQ2Yy00Njk0Nzc3N2QxNDgiLCJsb2NhbGUiOiJlbi1JTiIsIm5hbWUiOiJoYXJzaCBnaWxsIiwic3ViIjoiZWZjNGExNTMtZTgxNC00NDQ5LWEzYTctMWNlNGNkZjc1ZTkxIn0sImVtYWlsIjoiaGFyc2hnaWxsMDc2QGdtYWlsLmNvbSIsIm5hbWUiOiJoYXJzaCBnaWxsIiwicm9sbE5vIjoiMmsyM2NzdW4wMTIwOSIsImFjY2Vzc0NvZGUiOiJYanZUWngiLCJjbGllbnRJRCI6ImVmYzRhMTUzLWU4MTQtNDQ0OS1hM2E3LTFjZTRjZGY3NWU5MSIsImNsaWVudFNlY3JldCI6IkpTaEV2eXZQQ2ZxcXp2eGEifQ.Uugg_njGJHpOHR47CHnrcvK7pzoqpXXy5sGVZUvKWug"
const TYPE_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

async function getPriorityInbox(top = 10) {
  const response = await axios.get(
    "http://20.207.122.201/evaluation-service/notifications",
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );

  const notifications = response.data.notifications;

  const scored = notifications.map((n) => {
    const typeWeight = TYPE_WEIGHT[n.Type] || 1;
    const ageInMinutes = (Date.now() - new Date(n.Timestamp).getTime()) / 60000;
    const recencyScore = 1 / (1 + ageInMinutes);
    return { ...n, priorityScore: typeWeight + recencyScore };
  });

  const topN = scored
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, top);

  console.log(`Top ${top} Priority Notifications:`);
  console.log(JSON.stringify(topN, null, 2));
}

getPriorityInbox(10);