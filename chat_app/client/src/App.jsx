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

      privKey = await decryptPrivateKey(
        JSON.parse(encryptedData),
        password
      );

    } else {

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

    <div className="flex h-screen bg-gray-100">

      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg p-6 flex flex-col">

        <h2 className="text-xl font-bold mb-4">
          Secure Chat
        </h2>

        <input
          className="border p-2 rounded mb-2"
          placeholder="Username"
          onChange={e => setUsername(e.target.value)}
        />

        <input
          className="border p-2 rounded mb-3"
          type="password"
          placeholder="Password"
          onChange={e => setPassword(e.target.value)}
        />

        <div className="flex gap-2 mb-4">

          <button
            onClick={handleSignup}
            className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
          >
            Signup
          </button>

          <button
            onClick={handleLogin}
            className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600"
          >
            Login
          </button>

        </div>

        <hr className="mb-4" />

        <p className="text-sm text-gray-600 mb-1">
          Chat with:
        </p>

        <input
          className="border p-2 rounded"
          placeholder="Enter username"
          onChange={e => setPartner(e.target.value)}
        />

      </div>



      {/* Chat Area */}
      <div className="flex-1 flex flex-col">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">

          {messages.map((m, i) => (
            <div
              key={i}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg w-fit max-w-md"
            >
              {m}
            </div>
          ))}

        </div>



        {/* Message Input */}
        <div className="p-4 border-t bg-white flex gap-2">

          <input
            className="flex-1 border p-2 rounded"
            placeholder="Type message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />

          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Send
          </button>

        </div>

      </div>

    </div>

  );
}

export default App;