import { useState } from "react";
import { signup, login } from "./api";
import { socket } from "./socket";
import { generateKeyPair, encryptMessage, decryptMessage } from "./crypto";

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [keys, setKeys] = useState(null);

  const handleSignup = async () => {
    await signup(username, password);
    alert("Signup successful");
  };

  const handleLogin = async () => {
    const res = await login(username, password);
    setToken(res.data.token);
    const keyPair = await generateKeyPair();
    setKeys(keyPair);
  };

  const sendMessage = async () => {
    if (!keys) return alert("Keys not ready");

    const encrypted = await encryptMessage(message, keys.publicKey);

    socket.emit("send-message", encrypted);
    setMessage("");
  };

  socket.on("receive-message", async (cipherText) => {
    if (!keys) return;

    const decrypted = await decryptMessage(cipherText, keys.privateKey);
    setMessages(prev => [...prev, decrypted]);
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