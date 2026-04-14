import bcrypt from "bcrypt";

const password = "CV@Principal@101";

bcrypt.hash(password, 10).then((hash) => {
  console.log("Hashed Password:", hash);
});