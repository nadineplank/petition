exports.requireSignature = function(req, res, next) {
    if (req.session.userId) {
        res.redirect("/");
    } else {
        next();
    }
};

exports.requireNoSignature = function(req, res, next) {
    if (req.session.signatureId) {
        res.redirect("/");
    } else {
        next();
    }
};

exports.requireLoggedOutUser = function(req, res, next) {
    if (req.session.user_id) {
        res.redirect("/");
    } else {
        next();
    }
};
