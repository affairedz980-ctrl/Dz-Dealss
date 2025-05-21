import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    let token = req.header("Authorization");
    if (!token) return res.status(403).send("Access Denied");

    if (token.startsWith("Bearer ")) {
      token = token.slice(7, token.length).trimLeft();
    }

    const verified = jwt.verify(token, process.env.JWT_SECURE);
    req.user = verified;
    next();
  } catch (error) {
    // Only send the error message, not the entire error object
    res.status(500).json({ message: error.message });

    // Optionally, you could log more details server-side without causing a circular structure issue
    console.error("JWT verification error:", error.message);
  }
};
