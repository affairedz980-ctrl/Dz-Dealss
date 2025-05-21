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
} from "../components/post.js";
import express from "express";
import { verifyToken } from "../meadelwear/token.js";

const router = express.Router();

router.get("/", verifyToken, getAllPosts);
router.patch("/comments/:id", verifyToken, Commentaires);
router.get("/getcomments/:id", verifyToken, getComment);
router.patch("/rating/:id", verifyToken, Rating);
router.patch("/getrating/:id", verifyToken, getRating);
router.get("/getposts/:id", verifyToken, getPosts);
router.get("/getuserposts/:userId", verifyToken, getUserPosts);
router.delete("/deletepost/:id", verifyToken, deletePosts);
router.patch("/modifierAnnonce/:id", verifyToken, modifierAnnonce);

export default router;
