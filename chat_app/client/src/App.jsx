import { useState, useEffect, useRef } from "react";
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
  // ===== STATE =====
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [message, setMessage] = useState("");
  const [conversations, setConversations] = useState({}); // { partner: [messages] }
  const [privateKey, setPrivateKey] = useState(null);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState(null);

  // UI State
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const [showSettings, setShowSettings] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const messagesEndRef = useRef(null);

  // ===== PASSWORD VALIDATION =====
  const validatePassword = (pwd) => {
    return {
      length: pwd.length >= 12,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      symbol: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };
  };

  const isPasswordValid = (pwd) => {
    const validation = validatePassword(pwd);
    return Object.values(validation).every(v => v === true);
  };

  const passwordValidation = validatePassword(password);

  // ===== AUTO-SCROLL TO LATEST MESSAGE =====
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, selectedPartner]);

  // ===== FORMAT TIMESTAMP =====
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${mins}`;
  };

  // ===== CREATE CANONICAL CONVERSATION KEY =====
  const getConversationKey = (user1, user2) => {
    return [user1, user2].sort().join("-");
  };

  // ===== RECEIVE MESSAGES =====
  useEffect(() => {
    const handleReceiveMessage = async (payload) => {
      try {
        if (!privateKey) return;

        const text = await decryptMessage(
          payload.ciphertext,
          privateKey
        );

        const from = payload.from;
        const conversationKey = getConversationKey(username, from);

        const newMessage = {
          id: `${Date.now()}-${Math.random()}`,
          from: from,
          text,
          timestamp: Date.now(),
          isOwn: false
        };

        // Add message to the conversation with this user
        setConversations((prev) => {
          const updated = { ...prev };
          if (!updated[conversationKey]) {
            updated[conversationKey] = [];
          }
          updated[conversationKey].push(newMessage);
          return updated;
        });

      } catch (e) {
        console.error("Decryption failed:", e);
        setError("Failed to decrypt message from " + payload.from);
      }
    };

    socket.on("receive-message", handleReceiveMessage);
    return () => socket.off("receive-message", handleReceiveMessage);
  }, [privateKey, username]);

  // ===== SIGNUP =====
  const handleSignup = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (!isPasswordValid(password)) {
      setError("Password does not meet all requirements");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signup(username.trim(), password);
      setSuccessMessage("✓ Signup successful! Now log in.");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
      setUsername("");
      setPassword("");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  // ===== LOGIN + KEY HANDLING =====
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1: Login (token will be set as httpOnly cookie automatically)
      try {
        await login(username.trim(), password);
        setAuthToken(username.trim()); // Store username for reference
      } catch (err) {
        setError(err.response?.data?.error || "Login failed");
        setLoading(false);
        return;
      }

      // Step 2: Keys - Retrieve OR Create
      try {
        let encryptedData = localStorage.getItem("encryptedPrivateKey");
        let privKey;
        let pubKey;

        if (encryptedData) {
          // User has a stored key - decrypt it
          try {
            privKey = await decryptPrivateKey(
              JSON.parse(encryptedData),
              password
            );
            const storedPubKey = localStorage.getItem("publicKey");
            if (storedPubKey) {
              pubKey = storedPubKey;
            } else {
              throw new Error("Stored key mismatch - please reset");
            }
          } catch (err) {
            setError(`Failed to decrypt stored key: ${err.message}`);
            setLoading(false);
            return;
          }
        } else {
          // First login - generate new key pair
          const keyPair = await generateKeyPair();
          privKey = keyPair.privateKey;
          pubKey = await exportPublicKey(keyPair.publicKey);

          const encrypted = await encryptPrivateKey(
            privKey,
            password
          );

          localStorage.setItem(
            "encryptedPrivateKey",
            JSON.stringify(encrypted)
          );
          localStorage.setItem("publicKey", pubKey);
        }

        // Upload public key to server (token in cookie will be sent automatically)
        await uploadPublicKey(username.trim(), pubKey);

        setPrivateKey(privKey);
        setIsLoggedIn(true);
        setConversations({});
        setSelectedPartner(null);

        // Register socket with confirmation
        socket.emit("register", { username: username.trim() }, (ack) => {
          if (ack?.status === "ok") {
            console.log("Socket registration confirmed");
          }
        });

      } catch (err) {
        console.error(err);
        setError("Key setup failed: " + err.message);
        setAuthToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== LOGOUT =====
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      setIsLoggedIn(false);
      setUsername("");
      setPassword("");
      setConversations({});
      setSelectedPartner(null);
      setPrivateKey(null);
      setAuthToken(null);
      setError("");
      setShowSettings(false);
      socket.emit("unregister", username);
    }
  };

  // ===== CLEAR CHAT HISTORY =====
  const clearChatHistory = () => {
    if (window.confirm("Are you sure you want to delete all messages? This cannot be undone.")) {
      setConversations({});
      setSelectedPartner(null);
    }
  };

  // ===== SEND MESSAGE =====
  const sendMessage = async () => {
    const trimmedPartner = selectedPartner?.trim();
    const trimmedMessage = message.trim();

    if (!privateKey || !trimmedPartner || !trimmedMessage) {
      return;
    }

    try {
      setLoading(true);
      const res = await getPublicKey(trimmedPartner);

      const partnerKey = await importPublicKey(res.data.publicKey);

      const cipher = await encryptMessage(trimmedMessage, partnerKey);

      socket.emit("send-message", {
        from: username,
        to: trimmedPartner,
        ciphertext: cipher
      });

      const conversationKey = getConversationKey(username, trimmedPartner);
      const newMessage = {
        id: `${Date.now()}-${Math.random()}`,
        from: "You",
        text: trimmedMessage,
        timestamp: Date.now(),
        isOwn: true
      };

      // Add to this conversation
      setConversations((prev) => {
        const updated = { ...prev };
        if (!updated[conversationKey]) {
          updated[conversationKey] = [];
        }
        updated[conversationKey].push(newMessage);
        return updated;
      });

      setMessage("");
      setError("");

    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || "User not found or network error";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ===== KEYBOARD SHORTCUTS =====
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Enter" && isLoggedIn && selectedPartner) {
        if (!e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [message, selectedPartner, privateKey, authToken]);

  // ===== RENDER UTILS =====
  const bgClass = darkMode ? "bg-gray-900 text-white" : "bg-gray-100";
  const cardClass = darkMode ? "bg-gray-800 border-gray-700" : "bg-white";
  const inputClass = darkMode
    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
    : "bg-white border-gray-300 text-black";

  // ===== AUTH SCREEN =====
  if (!isLoggedIn) {
    return (
      <div className={`h-screen flex items-center justify-center ${bgClass}`}>
        <div className={`${cardClass} p-8 rounded-lg shadow-xl w-96 border`}>
          <h1 className="text-3xl font-bold mb-2 text-center">🔐</h1>
          <h2 className="text-2xl font-bold mb-6 text-center">Secure Chat</h2>

          {successMessage && (
            <div className="bg-green-500 text-white p-3 rounded-lg mb-4 text-center">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="bg-red-500 text-white p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          {/* Username Input */}
          <input
            className={`border p-3 rounded-lg mb-4 w-full ${inputClass}`}
            placeholder="Username (min 3 chars)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />

          {/* Password Input with Toggle */}
          <div className="relative mb-2">
            <input
              className={`border p-3 rounded-lg w-full ${inputClass}`}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              onClick={() => setShowPassword(!showPassword)}
              type="button"
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>

          {/* Password Requirements Checklist */}
          {password && (
            <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg mb-4 text-sm">
              <p className="font-semibold mb-2">Password Requirements:</p>
              <div className="space-y-1">
                <p className={passwordValidation.length ? "text-green-600" : "text-gray-500"}>
                  ✓ At least 12 characters {passwordValidation.length && "✓"}
                </p>
                <p className={passwordValidation.uppercase ? "text-green-600" : "text-gray-500"}>
                  ✓ Uppercase letter {passwordValidation.uppercase && "✓"}
                </p>
                <p className={passwordValidation.lowercase ? "text-green-600" : "text-gray-500"}>
                  ✓ Lowercase letter {passwordValidation.lowercase && "✓"}
                </p>
                <p className={passwordValidation.number ? "text-green-600" : "text-gray-500"}>
                  ✓ Number {passwordValidation.number && "✓"}
                </p>
                <p className={passwordValidation.symbol ? "text-green-600" : "text-gray-500"}>
                  ✓ Special symbol {passwordValidation.symbol && "✓"}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleSignup}
              disabled={loading}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                } text-white`}
            >
              {loading && username ? "Signing up..." : "Signup"}
            </button>

            <button
              onClick={handleLogin}
              disabled={loading}
              className={`flex-1 py-3 rounded-lg font-semibold transition font-bold text-lg ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
                } text-white`}
            >
              {loading && username ? "Logging in..." : "Login"}
            </button>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full p-2 rounded-lg border hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      </div>
    );
  }

  // ===== CHAT SCREEN =====
  return (
    <div className={`h-screen flex flex-col ${bgClass}`}>
      {/* Header */}
      <div className={`${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b p-4 flex justify-between items-center`}>
        <h1 className="text-2xl font-bold">🔐 Secure Chat</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg border transition ${darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"
              }`}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg border transition ${darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"
              }`}
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${cardClass} p-6 rounded-lg shadow-xl w-96 border`}>
            <h3 className="text-xl font-bold mb-4">Settings</h3>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Username: <span className="font-semibold">{username}</span></p>
              <button
                onClick={clearChatHistory}
                className="w-full p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition"
              >
                🗑️ Clear Chat History
              </button>
              <button
                onClick={handleLogout}
                className="w-full p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
              >
                🚪 Logout
              </button>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="mt-4 w-full p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Conversations List */}
        <div className={`w-72 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-r flex flex-col`}>
          {/* Account Section */}
          <div className={`${darkMode ? "bg-gray-700" : "bg-gray-100"} p-4 border-b`}>
            <h2 className="font-bold text-lg mb-2">👤 {username}</h2>
            <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Online <span className="text-green-500">●</span>
            </p>
          </div>

          {/* Search/Add Contact */}
          <div className="p-4 border-b">
            <input
              className={`border p-2 rounded-lg w-full text-sm ${inputClass}`}
              placeholder="Start new chat..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && searchInput.trim()) {
                  setSelectedPartner(searchInput.trim());
                  setSearchInput("");
                }
              }}
            />
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {Object.keys(conversations).length === 0 ? (
              <div className={`p-4 text-center text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                <p>No conversations yet</p>
                <p className="text-xs mt-2">Search a username above to start chatting</p>
              </div>
            ) : (
              Object.keys(conversations).map((key) => {
                // Extract the partner name from the canonical key
                const parts = key.split("-");
                const partner = parts[0] === username ? parts[1] : parts[0];

                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedPartner(partner);
                      setSearchInput("");
                    }}
                    className={`w-full text-left p-3 border-b transition ${selectedPartner === partner
                      ? darkMode
                        ? "bg-blue-700 border-gray-600"
                        : "bg-blue-100 border-gray-300"
                      : darkMode
                        ? "hover:bg-gray-700 border-gray-700"
                        : "hover:bg-gray-100 border-gray-200"
                      }`}
                  >
                    <p className="font-semibold truncate">{partner}</p>
                    <p className={`text-xs truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {conversations[key][conversations[key].length - 1]?.text || "..."}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Encryption Info */}
          <div className={`text-xs p-3 border-t ${darkMode ? "bg-gray-700 text-gray-200" : "bg-blue-50 text-gray-600"}`}>
            <p className="font-semibold mb-1">🔒 End-to-End Encrypted</p>
            <p>All messages are encrypted. Only you and your partner can read them.</p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className={`${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b p-4 flex justify-between items-center`}>
            <h3 className="text-lg font-bold">
              {selectedPartner ? `💬 ${selectedPartner}` : "Select a conversation"}
            </h3>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!selectedPartner ? (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-lg">Welcome, {username}!</p>
                <p className="text-sm mt-2">Select a conversation or search for a username to start chatting</p>
              </div>
            ) : (() => {
              const conversationKey = getConversationKey(username, selectedPartner);
              const msgs = conversations[conversationKey] || [];
              return msgs.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <p>No messages yet with {selectedPartner}</p>
                  <p className="text-sm mt-2">Say hello to start the conversation!</p>
                </div>
              ) : (
                msgs.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs p-3 rounded-lg ${m.isOwn
                        ? "bg-green-500 text-white"
                        : "bg-blue-500 text-white"
                        }`}
                    >
                      <p className="break-words">{m.text}</p>
                      <p className="text-xs opacity-70 mt-1">{formatTime(m.timestamp)}</p>
                    </div>
                  </div>
                ))
              );
            })()}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500 text-white p-2 text-center text-sm">
              {error}
            </div>
          )}

          {/* Input Area */}
          <div className={`${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-t p-4`}>
            <div className="flex gap-2 mb-2">
              <input
                className={`flex-1 border p-3 rounded-lg ${inputClass}`}
                placeholder={selectedPartner ? "Type message... (Enter to send)" : "Select a chat first"}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && selectedPartner) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={!selectedPartner || loading}
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim() || !selectedPartner || loading}
                className={`px-4 py-3 rounded-lg font-semibold transition ${message.trim() && selectedPartner && !loading
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-400 text-gray-600 cursor-not-allowed"
                  }`}
              >
                {loading ? "⏳" : "Send"}
              </button>
            </div>
            <p className="text-xs text-gray-500">🔒 Messages are end-to-end encrypted</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
