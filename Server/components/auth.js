import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import mongoose from "mongoose";

export const register = async (req, res) => {
  try {
    const { nomComplet, email, password, telephone, infos, date, adresse } =
      req.body;

    // Check if all fields are provided
    if (!nomComplet || !email || !password || !telephone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Hash the password before saving the user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // File path to save in the database (relative path)
    const picture = req.file.path;

    // Create a new user instance
    const newUser = new User({
      nomComplet,
      telephone,
      infos,
      date,
      adresse,
      email,
      password: hashedPassword,
      picture, // Save the filename in the database
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECURE);

    // Save the user to the database
    const savedUser = await newUser.save();

    // Send the saved user data as the response
    res.status(201).json({ user: savedUser, token });
  } catch (error) {
    // Log the error for debugging
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "Utilisateur non existant." });
    }

    // Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Mot de passe incorrect." });
    }

    // Generate a JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECURE);

    // Remove the password before sending the response
    const userWithoutPassword = { ...user._doc };
    delete userWithoutPassword.password;

    // Respond with token and user details
    res.status(200).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
};

export const DeleteUser = async (req, res) => {
  try {
    const { id } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ msg: "Utilisateur non existant." });
    }

    await user.deleteOne();

    return res.status(200).json({ msg: "Utilisateur supprimé avec succès." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
};

export const VerificationPassword = async (req, res) => {
  try {
    const { id, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ msg: "Utilisateur non existant." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ valid: false, msg: "Mot de passe incorrect." });
    }

    res.status(200).json({ valid: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { id, newpassword } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ msg: "Utilisateur non existant." });
    }

    // Hacher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newpassword, salt);

    // Mettre à jour le mot de passe dans la base de données
    await User.findByIdAndUpdate(id, { password: hashedPassword });

    res.status(200).json({ msg: "Mot de passe mis à jour avec succès." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
};

export const abonnées = async (req, res) => {
  try {
    const { userId, targetId } = req.body;

    // Vérifie que les deux IDs sont présents
    if (!userId || !targetId) {
      return res.status(400).json({ message: "Champs manquants." });
    }

    // Récupère l'utilisateur qui va s'abonner et la cible
    const user = await User.findById(userId);
    const targetUser = await User.findById(targetId);

    if (!user || !targetUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Abonnement ou désabonnement
    const isAlreadySubscribed = targetUser.followers.includes(userId);

    if (isAlreadySubscribed) {
      // Désabonnement
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== userId
      );
    } else {
      // Abonnement
      targetUser.followers.push(userId);
    }

    await targetUser.save();

    return res.status(200).json({
      message: isAlreadySubscribed
        ? "Désabonné avec succès."
        : "Abonné avec succès.",
      followers: targetUser.followers,
    });
  } catch (error) {
    console.error("Erreur:", error);
    return res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

export const getabonnées = async (req, res) => {
  try {
    const { id, userid } = req.params;

    const target = await User.findById(id);
    const user = await User.findById(userid);

    if (!target || !user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const isFollowing = target.followers.includes(userid); // id est l'ID du "target"

    res.status(200).json(isFollowing);
  } catch (error) {
    console.error("Erreur:", error);
    return res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

export const getRating2 = async (req, res) => {
  try {
    const { userId, id } = req.body; // Get userId from request body

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Find the rating for the specific user
    const userRating = user.rating.find((r) => r.userId === userId);

    // Calculate the average rating for the specific post
    const totalUsertRatings = user.rating.reduce((acc, r) => acc + r.rating, 0);
    const userRatingCount = user.rating.length;
    const postAverageRating =
      userRatingCount > 0 ? totalUsertRatings / userRatingCount : 0;

    res.status(200).json({
      profileRatings: user.rating,
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

export const Rating2 = async (req, res) => {
  try {
    const { userId, rating, id } = req.body; // Get userId and rating from request body

    // Find the post by ID
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Remove any existing rating for the user
    user.rating = user.rating.filter((r) => r.userId !== userId);

    // Add the new rating
    user.rating.push({ rating, userId });

    await user.save();

    const totalPostRatings = user.rating.reduce((acc, r) => acc + r.rating, 0);
    const postRatingCount = user.rating.length;
    const profileAverageRating =
      postRatingCount > 0 ? totalPostRatings / postRatingCount : 0;

    // Respond with the updated ratings and general ratio
    res.status(200).json({
      profilpostRatings: user.rating, // All individual ratings for the specific post
      profileAverageRating, // Overall average rating across all posts
    });
  } catch (error) {
    console.error("Error adding rating:", error.message);
    res
      .status(500)
      .json({ message: "Failed to add rating", error: error.message });
  }
};

export const Commentaires2 = async (req, res) => {
  try {
    const { userId, comment, id, nom } = req.body; // Extraction des données envoyées dans le corps de la requête

    // Recherche du post correspondant
    const user = await User.findById(id); // Assurez-vous que `id` correspond bien à l'ID MongoDB

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ajout du commentaire
    user.commentaire.push({
      commentId: new mongoose.Types.ObjectId().toString(),
      nom,
      picture: user.picture,
      comment,
      userId,
      date: new Date().toISOString().split("T")[0],
    });

    await user.save();

    // Réponse avec les commentaires mis à jour
    res.status(200).json({
      commentaire: user.commentaire,
    });
  } catch (error) {
    console.error("Error adding comment:", error.message);
    res
      .status(500)
      .json({ message: "Failed to add comment", error: error.message });
  }
};

export const getComment2 = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    res.status(200).json(user.commentaire);
  } catch (error) {
    console.error("Error adding comment:", error.message);
    res
      .status(500)
      .json({ message: "Failed to add comment", error: error.message });
  }
};

export const deleteComment2 = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const user = await User.findById(id);

    user.commentaire = user.commentaire.filter(
      (r) => r.commentId !== commentId
    );

    user.save();

    res.status(200).json(user.commentaire);
  } catch (error) {
    console.error("Error deleting comment:", error.message);
    res
      .status(500)
      .json({ message: "Failed to delete comment", error: error.message });
  }
};

export const modifierCompte = async (req, res) => {
  try {
    const { id } = req.params;
    const { nomComplet, email, infos, telephone } = req.body;

    // Vérification de l'ID MongoDB valide
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID invalide." });
    }

    // Vérification des données requises
    if (!nomComplet || !email || !telephone) {
      return res.status(400).json({ message: "Tous les champs sont requis." });
    }

    // Vérifier si le user existe
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ message: "Aucun utilisateur trouvé avec cet ID." });
    }

    // Mettre à jour les champs
    user.nomComplet = nomComplet;
    user.email = email;
    user.telephone = telephone;
    user.infos = infos;

    // Mettre à jour la photo si elle est envoyée
    if (req.file) {
      user.picture = req.file.path;
    }

    await user.save(); // Enregistre les modifications

    res.status(200).json({ message: "Utilisateur modifié avec succès.", user });
  } catch (error) {
    console.error("Erreur :", error);
    res.status(500).json({
      message: "Échec de la modification de l'utilisateur.",
      error: error.message,
    });
  }
};
