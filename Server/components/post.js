import Post from "../models/Post.js";
import User from "../models/User.js";
import { cloudinary } from "../cloudinary.js"; // Ensure correct path to your Cloudinary configuration

export const createPost = async (req, res) => {
  try {
    const { categorie, userId, description, prix, title } = req.body;

    // Validate required fields
    if (!userId || !prix || !title) {
      return res.status(400).json({
        message: "Missing required fields: userId, categorie, prix, or title",
      });
    }

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Upload images to Cloudinary (concurrently)
    const picturePaths = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        cloudinary.uploader.upload(file.path, { folder: "posts" })
      );
      const results = await Promise.all(uploadPromises);
      picturePaths.push(...results.map((result) => result.secure_url));
    }

    console.log("Uploaded images:", picturePaths);

    // Create a new post
    const newPost = new Post({
      userId,
      description,
      prix,
      title,
      categorie,
      userPicturePath: user.picturePath,
      picturePaths, // Array of image URLs
      likes: {}, // Initialize as empty map
      commentaire: [], // Initialize as empty array
    });

    console.log("New post description:", description); // Log for debugging
    await newPost.save();

    // Return the newly created post
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
    const post = await Post.find();
    res.status(200).json(post);
  } catch (error) {
    console.error("Error find posts:", error.message);
    res
      .status(500)
      .json({ message: "Failed to find posts", error: error.message });
  }
};

export const modifierAnnonce = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, prix, description, categorie } = req.body;
    console.log("req.body:", req.body);

    let images = req.body.images || [];

    // Vérification de l'ID MongoDB valide
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID invalide." });
    }

    // Vérification des données requises
    if (!title || !prix || !description || !categorie) {
      return res.status(400).json({ message: "Tous les champs sont requis." });
    }

    // Vérification que le prix est bien un nombre
    if (isNaN(prix)) {
      return res.status(400).json({ message: "Le prix doit être un nombre." });
    }

    // Vérifier si le post existe avant de le modifier
    const post = await Post.findById(id);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Aucun post trouvé avec cet ID." });
    }

    // Gestion des images uploadées via multer
    if (req.files && req.files.length > 0) {
      const uploadedImages = req.files.map((file) => file.path);
      post.picturePaths = uploadedImages;
    }

    // Mise à jour du post
    post.title = title;
    post.prix = prix;
    post.description = description;
    post.categorie = categorie;

    await post.save(); // Enregistre les modifications

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
    const { id } = req.params; // Get post ID
    const { userId } = req.body; // Get userId from request body

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Find the rating for the specific user
    const userRating = post.rating.find((r) => r.userId === userId);

    // Calculate the average rating for the specific post
    const totalPostRatings = post.rating.reduce((acc, r) => acc + r.rating, 0);
    const postRatingCount = post.rating.length;
    const postAverageRating =
      postRatingCount > 0 ? totalPostRatings / postRatingCount : 0;

    res.status(200).json({
      postRatings: post.rating,
      userRating, // Rating for the specific user
      postAverageRating, // Average rating for the specific post
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
    const { userId } = req.body;
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
