import { useState, useEffect } from "react";
import {
  signup,
  login,
  uploadPublicKey,
  getPublicKey
} from "./api";
import { socket } from "./socket";
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  encryptMessage,
  decryptMessage,
  encryptPrivateKey,
  decryptPrivateKey
} from "./crypto";

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [partner, setPartner] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [privateKey, setPrivateKey] = useState(null);

  // Receive messages
  useEffect(() => {
    socket.on("receive-message", async (payload) => {
      if (payload.to !== username || !privateKey) return;

      const text = await decryptMessage(
        payload.ciphertext,
        privateKey
      );
      setMessages(prev => [...prev, `${payload.from}: ${text}`]);
    });
  }, [privateKey, username]);

  const handleSignup = async () => {
    await signup(username, password);
    alert("Signup successful");
  };

  const handleLogin = async () => {
    await login(username, password);

    let encryptedData = localStorage.getItem("encryptedPrivateKey");

    let privKey;
    if (encryptedData) {
      // Existing user → decrypt stored key
      privKey = await decryptPrivateKey(
        JSON.parse(encryptedData),
        password
      );
    } else {
      // First login → generate keys
      const keyPair = await generateKeyPair();

      const exportedPub = await exportPublicKey(keyPair.publicKey);
      await uploadPublicKey(username, exportedPub);

      const encrypted = await encryptPrivateKey(
        keyPair.privateKey,
        password
      );

      localStorage.setItem(
        "encryptedPrivateKey",
        JSON.stringify(encrypted)
      );

      privKey = keyPair.privateKey;
    }

    setPrivateKey(privKey);
    alert("Logged in securely");
  };

  const sendMessage = async () => {
    if (!privateKey || !partner) return;

    const res = await getPublicKey(partner);
    const partnerKey = await importPublicKey(res.data.publicKey);

    const cipher = await encryptMessage(message, partnerKey);

    socket.emit("send-message", {
      from: username,
      to: partner,
      ciphertext: cipher
    });

    setMessage("");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Secure Chat (E2EE)</h2>

      <input placeholder="Username" onChange={e => setUsername(e.target.value)} />
      <input
        placeholder="Password"
        type="password"
        onChange={e => setPassword(e.target.value)}
      />

      <br /><br />
      <button onClick={handleSignup}>Signup</button>
      <button onClick={handleLogin}>Login</button>

      <hr />

      <input
        placeholder="Chat with username"
        onChange={e => setPartner(e.target.value)}
      />

      <br /><br />

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