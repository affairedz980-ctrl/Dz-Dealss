import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const register = async (req, res) => {
  try {
    const { nomComplet, email, password, telephone } = req.body;

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

      email,
      password: hashedPassword,

      picture, // Save the filename in the database
    });

    // Save the user to the database
    const savedUser = await newUser.save();

    // Send the saved user data as the response
    res.status(201).json(savedUser);
    console.log(savedUser);
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
