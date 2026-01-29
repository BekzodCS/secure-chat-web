import { useState } from "react";
import { signup, login } from "./api";
import { socket } from "./socket";

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const handleSignup = async () => {
    await signup(username, password);
    alert("Signup successful");
  };

  const handleLogin = async () => {
    const res = await login(username, password);
    setToken(res.data.token);
  };

  const sendMessage = () => {
    socket.emit("send-message", message);
    setMessage("");
  };

  socket.on("receive-message", (msg) => {
    setMessages((prev) => [...prev, msg]);
  });

  return (
    <div style={{ padding: 20 }}>
      <h2>Secure Chat (Prototype)</h2>

      <input placeholder="Username" onChange={e => setUsername(e.target.value)} />
      <input placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} />

      <br /><br />

      <button onClick={handleSignup}>Signup</button>
      <button onClick={handleLogin}>Login</button>

      <hr />

      <input
        placeholder="Message"
        value={message}
        onChange={e => setMessage(e.target.value)}
      />
      <button onClick={sendMessage}>Send</button>

      <ul>
        {messages.map((m, i) => <li key={i}>{m}</li>)}
      </ul>
    </div>
  );
}

export default App;