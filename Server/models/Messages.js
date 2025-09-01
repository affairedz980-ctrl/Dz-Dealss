import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema({
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ],
  messages: [
    {
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      text: String,
      commande: String,
      timestamp: { type: Date, default: Date.now },
      view: { type: Boolean, default: false },
      timeview: { type: Date, default: null },
    },
  ],
});

const Conversation = mongoose.model("Conversation", ConversationSchema);
export default Conversation;
