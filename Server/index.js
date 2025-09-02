import express, { response } from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { login, modifierCompte, register } from "./components/auth.js";
import { upload } from "./cloudinary.js";
import { verifyToken } from "./meadelwear/token.js";
import { createPost } from "./components/post.js";
import Posts from "./routes/posts.js";
import Conversation from "./models/Messages.js";
import emailjs from "@emailjs/nodejs";

const PING_URL = "https://dz-deals-2.onrender.com"; // Votre backend Render

setInterval(() => {
  fetch(PING_URL)
    .then((res) => console.log("Ping successful"))
    .catch((err) => console.error("Ping failed:", err));
}, 600000); // Toutes les 10 minutes (600000ms)

// Utility: Wrap async handlers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Configuration for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment Variables
dotenv.config();
const PORT = process.env.PORT || 6001;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/myapp";

// Initialize Express App
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // ou l'IP de ton téléphone
    methods: ["GET", "POST"],
  },
});
app.locals.io = io;

// lancer lorsque quelqu'un se connecte
io.on("connection", (socket) => {
  console.log("Client connected.");
});
// Static Assets
app.use("/assets", express.static(path.join(__dirname, "public/assets")));

// Routes
app.post(
  "/posts",
  verifyToken,
  upload.array("pictures", 3),
  asyncHandler(createPost)
);
app.post("/auth/regester", upload.single("picture"), asyncHandler(register));
app.post("/auth/login", asyncHandler(login));
app.patch(
  "/post/modifiercompte/:id",
  upload.single("picture"),
  asyncHandler(modifierCompte)
);
app.use("/post", upload.array("pictures", 3), Posts);

app.post("/conversations", async (req, res) => {
  const { participants } = req.body;

  if (!Array.isArray(participants) || participants.length !== 2) {
    return res.status(400).json({ error: "Il faut deux participants." });
  }

  try {
    const conversation = await Conversation.findOne({
      participants: { $all: participants },
      $expr: { $eq: [{ $size: "$participants" }, 2] },
    });

    let created = false;
    let finalConversation = conversation;

    if (!conversation) {
      const sortedParticipants = [...participants].sort(); // facultatif mais cohérent
      finalConversation = new Conversation({
        participants: participants,
        messages: [], // initialisation propre
      });
      await finalConversation.save();
      created = true;
    }

    res.status(200).json({
      conversationId: finalConversation._id,
      created,
      conversation: finalConversation,
    });
  } catch (err) {
    console.error("Erreur lors de la création de conversation:", err.message);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const { message, sender, commande } = req.body;
    const io = req.app.locals.io;

    if (!message?.trim() || !sender) {
      return res.status(400).json({ error: "Message or sender is missing." });
    }

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    const newMessage = {
      text: message.trim(),
      sender,
      ...(commande && { commande }),
      timestamp: new Date().toISOString(),
    };

    conversation.messages.push(newMessage);
    await conversation.save();

    // 💬 Emit à tous les sockets connectés
    io.emit("new-message", newMessage);

    res.status(200).json({ success: true, message: newMessage });
  } catch (err) {
    console.error("Error posting message:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/getconversations/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const conversations = await Conversation.find({
      participants: id,
    });

    res.status(200).json({ conversations });
  } catch (err) {
    console.error("Erreur:", err.message);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.patch("/conversations/:id/view", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, time } = req.body;

    if (!userId || !time) {
      return res.status(400).json({ error: "Missing userId or time." });
    }

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    // 1. Trouver le dernier message REÇU (envoyé par l’autre)
    const lastMessageReceived = [...conversation.messages]
      .reverse()
      .find((msg) => String(msg.sender) !== String(userId));

    if (!lastMessageReceived) {
      return res.status(400).json({ error: "No received messages to update." });
    }

    // 2. Marquer comme vu
    lastMessageReceived.view = true;
    lastMessageReceived.timeview = time;

    // 3. Trouver le dernier message ENVOYÉ par l’utilisateur, qui a été vu
    const lastMessageViewed = [...conversation.messages]
      .reverse()
      .find(
        (msg) => String(msg.sender) === String(userId) && msg.view === true
      );

    await conversation.save();

    res.status(200).json({
      lastMessageViewedId: lastMessageViewed?._id || null,
      viewedAt: lastMessageViewed?.timeview || null,
    });
  } catch (err) {
    console.error("Error updating view state:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/send-email", async (req, res) => {
  const { name, email, phone, message } = req.body;

  try {
    const result = await emailjs.send(
      "service_f8om37e", // ton service ID
      "template_0csjn7b", // ton template ID
      { name, email, phone, message },
      {
        publicKey: "awCS2p1v7awW4OQff", // encore requis même si tu utilises privateKey
        privateKey: "zKFfNlPSsefcbaf6v0jve", // ajoute ta private key ici
      }
    );

    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("Erreur:", err);
    res.status(500).json({ success: false, message: "Erreur envoi email" });
  }
});

// Database Connection
mongoose
  .connect(MONGO_URL)
  .then(() => {
    server.listen(PORT, () =>
      console.log(`Server running on port: ${PORT}, DB Connected!`)
    );
  })
  .catch((error) => console.error(`Database connection error: ${error}`));

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (process.env.NODE_ENV === "development") {
    res.status(500).json({ error: err.message });
  } else {
    res.status(500).json({ error: "Something went wrong!" });
  }
});
