import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  nomComplet: {
    type: String,
    min: 2,
    max: 50,
  },
  email: {
    type: String,
    max: 50,
    unique: true,
  },
  password: {
    type: String,

    min: 5,
  },
  date: { type: Date, default: Date.now },
  followers: {
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

  adresse: String,
  infos: String,
  profession: String,
  telephone: String,
  picturePath: String,
  friends: Array,
  picture: String,
});

const User = mongoose.model("User", UserSchema);
export default User;
