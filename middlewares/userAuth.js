const User = require("../models/users");

exports.isAuth = (req, res, next) => {
  try {
    if (!req.session.isAuth) {
      res.redirect("/user/login");
    }
  } catch (err) {
    console.error("Error in admin session", err);
    res.redirect("/user/login");
  }
};

exports.isNotAuth = (req, res, next) => {
  try {
    if (!req.session.isAuth) {
      res.render("user/index");
    } else {
      next();
    }
  } catch (err) {
    console.error("Error in admin session", err);
    res.redirect("/user/login");
  }
};

// exports.ifLogged = async (req, res, next) => {
//   try {
//     const userId = req.session.userId;
//     if (!userId) {
//       req.flash("error", "You are not authorized");
//       return res.redirect("/user/index");
//     }

//     const user = await User.findOne({ _id: userId });
//     if (!user) {
//       req.flash("error", "User not found");
//       return res.redirect("/user/login");
//     }

//     if (!user.isBlocked) {
//       // Ensure the user is not blocked
//       console.log("User is not blocked:", !user.isBlocked);
//       if (req.session.otp) {
//         console.log("OTP exists in session:", req.session.otp);
//       }
//       return next(); // Continue to the next middleware or route handler
//     } else {
//       req.flash("error", "Your account is blocked");
//       return res.redirect("/user/login");
//     }
//   } catch (err) {
//     console.error("Error in user session", err);
//     req.flash("error", "An error occurred");
//     res.redirect("/user/login");
//   }
// };


exports.isOtp = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const user = userId ? await User.findOne({ _id: userId }) : null;

    // Case 1: User is not logged in and not in signup or forgot password process
    if (!userId && !req.session.signup && !req.session.otp) {
      req.flash("error", "You are not authorized");
      return res.redirect("/user/index");
    }

    // Case 2: User is in signup or forgot password process
    if (userId || req.session.signup || req.session.otp) {
      console.log("User is in signup or forgot password process");
      return next();
    }

    // Fallback case (shouldn't reach here normally)
    req.flash("error", "An error occurred");
    res.redirect("/user/login");
  } catch (err) {
    console.error("Error in user session", err);
    req.flash("error", "An error occurred");
    res.redirect("/user/login");
  }
};

exports.isBlocked = async (req, res, next) => {
  try {
    const userId=req.session.userId
    const user = await User.findOne({ _id: userId });
    console.log("req.session.user:",req.session.user);
console.log("user:",user);
    if (user) {
      if (!user.isBlocked) {
        // User is not blocked
        console.log("User is not blocked:", !user.isBlocked);
        return next(); // Continue to the next middleware or route handler
      } else {
        // User is blocked
        req.flash("error", "Your account is blocked");
        return res.redirect("/user/login");
      }
    } else {
      // User not found
      req.flash("error", "User not found");
      return res.redirect("/user/login");
    }
  } catch (err) {
    console.error("Error in user session", err);
    req.flash("error", "An error occurred");
    res.redirect("/user/login");
  }
};

