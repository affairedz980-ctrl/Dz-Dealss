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
    },
    categorie: {
      type: String,
      required: true,
    },
    description: String,
    picturePaths: { type: [String], default: [] }, // Array of picture paths
    userPicturePath: String,
    promotions: {
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
    couleurs: {
      type: Array,
      default: [],
    },
    views: { type: Number, default: 0 },
    name: String,
    typeVente: String,
    typePaiement: String,
    etat: String,
    commande: [
      {
        user: { type: String, ref: "User" },
        suivis: { type: String, default: "En attente" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    offre: {
      type: [
        {
          _id: { type: mongoose.Schema.Types.ObjectId, required: true },
          user: { type: String, required: true },
          suivis: { type: String, default: "En attente" },
          createdAt: { type: Date, default: Date.now },
          prixProposé: Number,
        },
      ],
      default: [], // 👈 même si vide, c'est cohérent
    },
    viewsHistory: [
      {
        _id: false,
        date: { type: Date, required: true },
        count: { type: Number, default: 0 },
      },
    ],
    souCategorie: String,
    souCategorie2: String,
    souCategorie3: String,
    ancienprix: String,
    nouveauprix: String,
    tailles: {
      type: Array,
      default: [],
    },
    profile: String, // si tu gardes ça, assure-toi que c'est pertinent ici
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);
export default Post;
