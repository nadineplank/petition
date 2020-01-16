exports.requireLoggedOutUser = function(req, res, next) {
    if (req.session.userId) {
        res.redirect("/petition");
    } else {
        next();
    }
};

exports.requireSignature = function(req, res, next) {
    if (!req.session.signatureId) {
        res.redirect("/petition");
    } else {
        next();
    }
};

exports.requireNoSignature = function(req, res, next) {
    if (req.session.signatureId) {
        res.redirect("/thanks");
    } else {
        next();
    }
};
