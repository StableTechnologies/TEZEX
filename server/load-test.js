// needs k6 to run
import http from "k6/http";

export default function () {
  var url = "http://localhost:8000/bot/update";
  var payload = JSON.stringify({
    id: "95efad2f-85a5-43a9-836d-f9d6ab923a98",
  });
  var params = {
    headers: {
      "Content-Type": "application/json",
    },
  };
  http.post(url, payload, params);
}
