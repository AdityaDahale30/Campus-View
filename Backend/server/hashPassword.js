import bcrypt from "bcrypt";

const password = "CV23511510250";

bcrypt.hash(password, 10).then((hash) => {
  console.log("Hashed Password:", hash);
});