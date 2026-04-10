import bcrypt from "bcrypt";

const password = "Pass@123";

bcrypt.hash(password, 10).then((hash) => {
  console.log("Hashed Password:", hash);
});