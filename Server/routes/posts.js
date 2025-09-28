import {
  getAllPosts,
  Commentaires,
  getComment,
  Rating,
  getRating,
  getPosts,
  getUserPosts,
  deletePosts,
  modifierAnnonce,
  getUser,
  addView,
  getAllUsers,
  getCommands,
  getSelleerCommands,
  deleteComment,
} from "../components/post.js";
import express from "express";
import { verifyToken } from "../meadelwear/token.js";
import {
  abonnées,
  Commentaires2,
  deleteComment2,
  DeleteUser,
  getabonnées,
  getComment2,
  getRating2,
  modifierCompte,
  Rating2,
  updatePassword,
  VerificationPassword,
} from "../components/auth.js";

const router = express.Router();

router.patch("/abonnees", abonnées);
router.get("/", getAllPosts);
router.get("/commande/:userId", getCommands);
router.get("/user/:userId", getUser);
router.patch("/comments/:id", Commentaires);
router.get("/getcomments/:id", getComment);
router.patch("/comments", Commentaires2);
router.get("/getcomments2/:id", getComment2);
router.patch("/rating/:id", Rating);
router.patch("/getrating/:id", getRating);
router.get("/getposts/:id", getPosts);
router.get("/getsellercommands/:userId", getSelleerCommands);
router.get("/getuserposts/:userId", getUserPosts);
router.delete("/deletepost/:id", verifyToken, deletePosts);
router.patch("/modifierAnnonce/:id", verifyToken, modifierAnnonce);
router.patch("/rating", Rating2);
router.patch("/getrating", getRating2);
router.get("/getabonees/:id/:userid", getabonnées);
router.delete("/deleteusercomment/:commentId/:id", deleteComment2);
router.delete("deletepostcomment/:commentId/:id", deleteComment);
router.patch("/views/:id", addView);
router.get("/users", getAllUsers);
router.patch("/motdepasse", updatePassword);
router.post("/verification", VerificationPassword);
router.delete("/suppression", DeleteUser);

export default router;
