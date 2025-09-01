import Post from "../models/Post.js";
import User from "../models/User.js";
import { cloudinary } from "../cloudinary.js"; // Ensure correct path to your Cloudinary configuration
import mongoose from "mongoose";

export const createPost = async (req, res) => {
  try {
    const {
      categorie,
      userId,
      name,
      description,
      prix,
      title,
      etat,
      profile,
      date,
      couleurs,
      promotions,
      typeVente,
      typePaiement,
      souCategorie,
      souCategorie2,
      souCategorie3,
      tailles,
      nouveauprix,
      ancienprix,
    } = req.body;
    // Validation
    if (!userId || !title) {
      return res.status(400).json({
        message: "Missing required fields: userId, categorie, prix, or title",
      });
    }

    // Vérifie si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Upload des images vers Cloudinary
    const picturePaths = [];
    if (req.files?.length > 0) {
      const uploadPromises = req.files.map((file) =>
        cloudinary.uploader.upload(file.path, { folder: "posts" })
      );
      const results = await Promise.all(uploadPromises);
      picturePaths.push(...results.map((result) => result.secure_url));
    }

    // Objet post sans champs vides
    const postData = {
      userId,
      description,
      profile,
      name,
      date,
      title,
      etat,
      typePaiement,
      souCategorie,
      typeVente,
      categorie,
      userPicturePath: user.picturePath,
      picturePaths,
      commentaire: [],
    };

    // Ajouter seulement si valeur réelle
    if (couleurs?.length) postData.couleurs = couleurs;
    if (promotions?.length) postData.promotions = promotions;
    if (tailles?.length) postData.tailles = tailles;
    if (souCategorie2?.length) postData.souCategorie2 = souCategorie2;
    if (souCategorie3?.length) postData.souCategorie3 = souCategorie3;
    if (prix != null) postData.prix = prix; // accepte 0 mais pas null/undefined
    if (ancienprix != null) postData.ancienprix = ancienprix;
    if (nouveauprix != null) postData.nouveauprix = nouveauprix;

    const newPost = new Post(postData);
    await newPost.save();

    res.status(201).json(newPost);
  } catch (error) {
    console.error("Error creating post:", error.message);
    res
      .status(500)
      .json({ message: "Failed to create post", error: error.message });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const smartSorted = await Post.aggregate([
      {
        $addFields: {
          score: {
            $add: [
              {
                $multiply: [
                  { $subtract: [new Date(), "$createdAt"] },
                  -0.000001, // fraîcheur : plus c'est récent, plus c'est haut
                ],
              },
              {
                $multiply: ["$views", 100], // popularité
              },
            ],
          },
        },
      },
      { $sort: { score: -1 } }, // les plus pertinents en haut
    ]);

    res.status(200).json(smartSorted);
  } catch (error) {
    console.error("Error find posts:", error.message);
    res.status(500).json({
      message: "Échec du chargement des annonces",
      error: error.message,
    });
  }
};

export const modifierAnnonce = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      prix,
      description,
      commande,
      couleurs,
      promotions,
      typePayement,
      user,
      offre, // 👈 tu ne l’avais pas extrait du body
    } = req.body;

    // Vérification ID valide
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID invalide." });
    }

    // Vérifier si le post existe
    const post = await Post.findById(id);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Aucun post trouvé avec cet ID." });
    }

    // Gestion des images uploadées via multer
    if (req.files && req.files.length > 0) {
      post.picturePaths = req.files.map((file) => file.path);
    }

    // Mise à jour des champs simples
    if (title) post.title = title;
    if (prix) post.prix = prix;
    if (description) post.description = description;
    if (couleurs) post.couleurs = couleurs;
    if (promotions) post.promotions = promotions;
    if (typePayement) post.typePayement = typePayement;

    // ---------------------------
    // 🔹 Gestion des commandes
    // ---------------------------
    if (commande) {
      const existante = post.commande.find((cmd) => cmd.user === user);

      if (
        ["Livré", "En cours de livraison", "Livraison annulée"].includes(
          commande
        )
      ) {
        if (existante) {
          existante.suivis = commande;
          post.markModified("commande");
        } else {
          console.warn("Commande non trouvée pour l'utilisateur :", user);
        }
      } else {
        try {
          const parsedCommande =
            typeof commande === "string" && commande.trim().startsWith("{")
              ? JSON.parse(commande)
              : commande;

          const commandeAvecId = {
            _id: new mongoose.Types.ObjectId(),
            ...parsedCommande,
            date: new Date(),
          };

          post.commande.push(commandeAvecId);
          post.markModified("commande");
        } catch (error) {
          console.error("Erreur lors du parsing de la commande :", error);
        }
      }
    }

    // ---------------------------
    // 🔹 Gestion des offres
    // ---------------------------
    if (offre) {
      const existante = post.offre.find((cmd) => cmd.user === user);

      if (["Accepté", "Refusé"].includes(offre)) {
        if (existante) {
          existante.suivis = offre;
          post.markModified("offre");
        } else {
          console.warn("Offre non trouvée pour l'utilisateur :", user);
        }
      } else {
        try {
          const parsedOffre =
            typeof offre === "string" && offre.trim().startsWith("{")
              ? JSON.parse(offre)
              : offre;

          const offreAvecId = {
            _id: new mongoose.Types.ObjectId(),
            ...parsedOffre,
            date: new Date(),
          };

          post.offre.push(offreAvecId);
          post.markModified("offre");
        } catch (error) {
          console.error("Erreur lors du parsing de l'offre :", error);
        }
      }
    }

    // Enregistrement
    await post.save();
    res.status(200).json({ message: "Post modifié avec succès.", post });
  } catch (error) {
    console.error("Erreur :", error);
    res.status(500).json({
      message: "Échec de la modification du post.",
      error: error.message,
    });
  }
};

export const deletePosts = async (req, res) => {
  try {
    const { id } = req.params; // Récupération de l'identifiant du post

    // Vérification de la validité de l'ID
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID invalide." });
    }

    // Rechercher le post par ID
    const post = await Post.findById(id);

    // Si aucun post n'est trouvé
    if (!post) {
      return res
        .status(404)
        .json({ message: "Aucun post trouvé avec cet ID." });
    }

    // Suppression du post
    await post.deleteOne();

    // Réponse au client
    res.status(200).json({ message: "Post supprimé avec succès." });
  } catch (error) {
    console.error("Error :", error.message);
    res.status(500).json({
      message: "Échec de la suppression du post.",
      error: error.message,
    });
  }
};

export const getPosts = async (req, res) => {
  try {
    const { id } = req.params; // Récupération de l'identifiant du post

    const post = await Post.findById(id); // Assurez-vous que `id` correspond bien à l'ID MongoDB
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json(post);
  } catch (error) {
    console.error("Error :", error.message);
    res
      .status(500)
      .json({ message: "Failed to get post :", error: error.message });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params; // Récupération de l'ID utilisateur

    // Vérification de la validité de l'ID
    if (!userId) {
      return res.status(400).json({ message: "L'ID utilisateur est requis." });
    }

    // Récupération des posts de l'utilisateur
    const posts = await Post.find({ userId }).exec();

    // Vérification si aucun post n'est trouvé
    if (posts.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucun post trouvé pour cet utilisateur." });
    }

    // Envoi des posts au client
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error :", error.message);
    res.status(500).json({
      message: "Échec lors de la récupération des publications.",
      error: error.message,
    });
  }
};

export const getCommands = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "L'ID utilisateur est requis." });
    }

    // On récupère tous les posts contenant au moins une commande de l'utilisateur
    const posts = await Post.find({ "commande.user": userId }).exec();

    let allCommands = posts.flatMap((post) => {
      if (!post.commande || post.commande.length === 0) return [];

      return post.commande
        .filter((cmd) => cmd.user === userId)
        .map((cmd) => ({
          id: cmd._id.toString(), // identifiant unique
          suivis: cmd.suivis,
          postId: post._id.toString(),
          postTitle: post.title,
          postImage: post.picturePaths?.[0] || null,
          date: post.createdAt,
          userId: post.userId,
          categorie: post.souCategorie2 || post.souCategorie || null,
          description: post.description || "",
        }));
    });

    if (allCommands.length === 0) {
      return res.status(404).json({ message: "Aucune commande trouvée." });
    }

    // 🔥 Regrouper par `postId` et compter
    const groupedCommands = Object.values(
      allCommands.reduce((acc, cmd) => {
        const key = `${cmd.postId}-${cmd.userId}`; // clé unique pour une commande
        if (!acc[key]) {
          acc[key] = { ...cmd, count: 1 }; // première occurrence
        } else {
          acc[key].count += 1; // incrémenter
        }
        return acc;
      }, {})
    );

    res.status(200).json(groupedCommands);
  } catch (error) {
    console.error("Erreur :", error.message);
    res.status(500).json({
      message: "Échec lors de la récupération des commandes.",
      error: error.message,
    });
  }
};

export const getSelleerCommands = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "L'ID utilisateur est requis." });
    }

    // Posts de l'utilisateur avec au moins une commande
    const posts = await Post.find({
      userId: userId,
      commande: { $exists: true, $ne: [] },
    }).exec();

    // Ici, on garde UN OBJET PAR POST
    const userCommands = posts.map((post) => ({
      commande: post.commande, // on garde toutes les commandes dans un tableau
      postId: post._id,
      viewsHistory: post.viewsHistory,
      views: post.views,
      postTitle: post.title,
      postImage: post.picturePaths?.[0] || null,
      date: post.createdAt,
      userId: post.userId,
      categorie: post.souCategorie2 || post.souCategorie,
      description: post.description,
    }));

    if (!userCommands.length) {
      return res.status(404).json({ message: "Aucune commande trouvée." });
    }

    res.status(200).json(userCommands);
  } catch (error) {
    console.error("Erreur :", error.message);
    res.status(500).json({
      message: "Échec lors de la récupération des commandes.",
      error: error.message,
    });
  }
};

export const Commentaires = async (req, res) => {
  try {
    const { id } = req.params; // Récupération de l'identifiant du post
    const { userId, comment } = req.body; // Extraction des données envoyées dans le corps de la requête

    // Recherche du post correspondant
    const post = await Post.findById(id); // Assurez-vous que `id` correspond bien à l'ID MongoDB

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Ajout du commentaire
    post.commentaire.push({
      comment,
      userId,
      date: new Date().toISOString().split("T")[0],
    });

    await post.save();

    // Réponse avec les commentaires mis à jour
    res.status(200).json({
      commentaire: post.commentaire,
    });
  } catch (error) {
    console.error("Error adding comment:", error.message);
    res
      .status(500)
      .json({ message: "Failed to add comment", error: error.message });
  }
};

export const getRating = async (req, res) => {
  try {
    const { id } = req.params; // Post ID
    const { userId } = req.body || {}; // Optionnel

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Si l'utilisateur est connecté, trouver sa note, sinon null
    const userRating = userId
      ? post.rating.find((r) => r.userId === userId)
      : null;

    // Calculer la moyenne
    const totalPostRatings = post.rating.reduce((acc, r) => acc + r.rating, 0);
    const postRatingCount = post.rating.length;
    const postAverageRating =
      postRatingCount > 0 ? totalPostRatings / postRatingCount : 0;

    res.status(200).json({
      postRatings: post.rating,
      userRating, // null si non connecté
      postAverageRating,
    });
  } catch (error) {
    console.error("Error retrieving rating:", error.message);
    res
      .status(500)
      .json({ message: "Failed to retrieve rating", error: error.message });
  }
};

export const Rating = async (req, res) => {
  try {
    const { id } = req.params; // Get post ID
    const { userId, rating } = req.body; // Get userId and rating from request body

    // Find the post by ID
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Remove any existing rating for the user
    post.rating = post.rating.filter((r) => r.userId !== userId);

    // Add the new rating
    post.rating.push({ rating, userId });

    await post.save();

    const totalPostRatings = post.rating.reduce((acc, r) => acc + r.rating, 0);
    const postRatingCount = post.rating.length;
    const postAverageRating =
      postRatingCount > 0 ? totalPostRatings / postRatingCount : 0;

    // Respond with the updated ratings and general ratio
    res.status(200).json({
      postRatings: post.rating, // All individual ratings for the specific post
      postAverageRating, // Overall average rating across all posts
    });
  } catch (error) {
    console.error("Error adding rating:", error.message);
    res
      .status(500)
      .json({ message: "Failed to add rating", error: error.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    res.status(200).json(user);
  } catch (error) {
    console.error("Error adding comment:", error.message);
    res
      .status(500)
      .json({ message: "Failed to add comment", error: error.message });
  }
};

export const getComment = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    res.status(200).json(post.commentaire);
  } catch (error) {
    console.error("Error adding comment:", error.message);
    res
      .status(500)
      .json({ message: "Failed to add comment", error: error.message });
  }
};

function getWeekNumber(date = new Date()) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export const addView = async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // date sans heures

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    // Total views
    post.views = (post.views || 0) + 1;

    if (!post.viewsHistory) post.viewsHistory = [];

    // Vérifier si une entrée existe déjà pour aujourd'hui
    const todayEntry = post.viewsHistory.find(
      (v) => new Date(v.date).getTime() === today.getTime()
    );

    if (todayEntry) {
      todayEntry.count += 1;
    } else {
      post.viewsHistory.push({ date: today, count: 1 });
    }

    // Supprimer les entrées de +30 jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    post.viewsHistory = post.viewsHistory.filter(
      (v) => new Date(v.date) >= thirtyDaysAgo
    );

    await post.save();
  } catch (error) {
    res.status(500).json({ error: "Erreur ajout de vue" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const user = await User.find();

    res.status(200).json(user);
  } catch (error) {
    console.error("Error adding comment:", error.message);
    res
      .status(500)
      .json({ message: "Failed to add comment", error: error.message });
  }
};
