import mongoose, { Schema } from "mongoose";

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    prix: {
      type: String,
      required: true,
    },
    categorie: {
      type: String,
      required: true,
    },
    description: String,
    picturePaths: { type: [String], default: [] }, // Array of picture paths
    userPicturePath: String,
    likes: {
      type: Array,
      default: [],
    },
    rating: {
      type: Array,
      default: [],
    },
    commentaire: {
      type: Array,
      default: [],
    },
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);
export default Post;
